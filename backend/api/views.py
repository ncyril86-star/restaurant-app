from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import send_mail
from django.conf import settings
import json
import os

# Firebase / Firestore
import firebase_admin
from firebase_admin import credentials, firestore

# WebSocket imports
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


# ── Firebase init ────────────────────────────────────────────────
def _get_db():
    """Return a Firestore client, initialising the app on first call."""
    if not firebase_admin._apps:
        # 1. Try environment variable with raw JSON content (Best for Cloud/Render)
        cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
        if cred_json:
            try:
                # Initialize using the JSON string directly
                from json import loads
                cred_dict = loads(cred_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
            except Exception as e:
                print(f"Error initializing Firebase from env var: {e}")
        
        # 2. Fallback to service-account JSON file path
        if not firebase_admin._apps:
            sa_path = os.getenv(
                "FIREBASE_SERVICE_ACCOUNT_PATH",
                os.path.join(
                    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
                    "restaurant-2ef10-firebase-adminsdk-fbsvc-6887285a18.json",
                ),
            )
            if os.path.exists(sa_path):
                cred = credentials.Certificate(sa_path)
                firebase_admin.initialize_app(cred)
            else:
                # If everything fails, initialize without credentials for local dev
                # (This will only work if running in a Google Cloud environment or local emulator)
                firebase_admin.initialize_app()
    return firestore.client()


# ── Helpers ──────────────────────────────────────────────────────
def _notify_ws(data: dict):
    """Push a message to the 'dashboard' WebSocket group (best-effort)."""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "dashboard",
            {"type": "send_dashboard_update", "data": data},
        )
    except Exception:
        pass  # WebSocket is optional


# =========================
# BASIC ENDPOINTS
# =========================

@csrf_exempt
@require_http_methods(["GET"])
def root(request):
    return JsonResponse({"message": "Restaurant API is running"})


@csrf_exempt
@require_http_methods(["GET"])
def health(request):
    return JsonResponse({"status": "healthy"})


# =========================
# MENU  (Firestore CRUD)
# =========================

@csrf_exempt
@require_http_methods(["GET", "POST"])
def menu_list(request):
    db = _get_db()
    col = db.collection("menuItems")

    if request.method == "GET":
        docs = col.stream()
        items = []
        for doc in docs:
            d = doc.to_dict()
            d["id"] = doc.id
            items.append(d)
        return JsonResponse(items, safe=False)

    # POST – create
    try:
        data = json.loads(request.body)
        doc_ref = col.add({
            "name": data.get("name", ""),
            "description": data.get("description", ""),
            "price": float(data.get("price", 0)),
            "category": data.get("category", ""),
            "image": data.get("image", ""),
            "is_available": data.get("is_available", True),
        })
        new_id = doc_ref[1].id
        result = {**data, "id": new_id}

        _notify_ws({"type": "MENU_UPDATED", "item": result})
        return JsonResponse(result, status=201)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
@require_http_methods(["PUT", "DELETE"])
def menu_detail(request, item_id):
    db = _get_db()
    doc_ref = db.collection("menuItems").document(item_id)

    if request.method == "DELETE":
        doc_ref.delete()
        _notify_ws({"type": "MENU_UPDATED", "deleted": item_id})
        return JsonResponse({"deleted": item_id})

    # PUT – update
    try:
        data = json.loads(request.body)
        update_fields = {}
        for key in ("name", "description", "category", "image", "is_available"):
            if key in data:
                update_fields[key] = data[key]
        if "price" in data:
            update_fields["price"] = float(data["price"])

        doc_ref.update(update_fields)
        _notify_ws({"type": "MENU_UPDATED", "updated": item_id})
        return JsonResponse({"id": item_id, **update_fields})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


# =========================
# ORDERS
# =========================

@csrf_exempt
@require_http_methods(["GET"])
def orders_list(request):
    db = _get_db()
    docs = db.collection("orders").stream()
    orders = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        orders.append(d)
    return JsonResponse(orders, safe=False)


@csrf_exempt
@require_http_methods(["GET"])
def order_detail(request, order_id):
    db = _get_db()
    doc = db.collection("orders").document(order_id).get()
    if not doc.exists:
        return JsonResponse({"error": "Not found"}, status=404)
    data = doc.to_dict()
    data["id"] = doc.id
    return JsonResponse(data)


@csrf_exempt
@require_http_methods(["POST"])
def mark_order_paid(request, order_id):
    """Mark an order as paid after Stripe payment (uses Admin SDK, bypasses rules)."""
    db = _get_db()
    doc_ref = db.collection("orders").document(order_id)
    doc = doc_ref.get()
    if not doc.exists:
        return JsonResponse({"error": "Not found"}, status=404)

    try:
        data = json.loads(request.body) if request.body else {}
        from google.cloud.firestore import SERVER_TIMESTAMP

        doc_ref.update({
            "status": "paid",
            "paidAt": SERVER_TIMESTAMP,
            "stripeSessionId": data.get("stripeSessionId", ""),
            "paymentMethod": data.get("paymentMethod", "stripe"),
        })

        # Try to send an email receipt
        try:
            order_data = doc.to_dict()
            customer_email = order_data.get("customerEmail") or data.get("customerEmail")
            
            print(f"📧 Attempting email: to={customer_email}, from={settings.EMAIL_HOST_USER}")

            if customer_email and settings.EMAIL_HOST_USER:
                items_list = order_data.get("items", [])
                
                # Build receipt text
                items_text = ""
                html_items = ""
                total = 0
                for it in items_list:
                    price = float(it.get("price", 0))
                    qty = int(it.get("qty", it.get("quantity", 1)))
                    item_total = price * qty
                    items_text += f"- {qty}x {it.get('name', 'Item')} (RM {item_total:.2f})\n"
                    
                    html_items += f'''
                    <tr>
                      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 15px;">{qty}x {it.get('name', 'Item')}</td>
                      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #111827; font-size: 15px;">RM {item_total:.2f}</td>
                    </tr>
                    '''
                    total += item_total
                
                # Plain Text Fallback
                msg = f"Payment Successful!\n\nThank you for your order at MakanSedap.\n\n"
                msg += f"Order ID: {order_id}\n\nItems Ordered:\n{items_text}\n"
                msg += f"Total Paid: RM {total:.2f}\n\nYour food is being prepared."
                
                # Beautiful HTML Receipt
                html_msg = f'''
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 16px; background-color: #f9fafb;">
                  <div style="background-color: white; border-radius: 16px; padding: 40px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #f3f4f6;">
                    
                    <div style="text-align: center; margin-bottom: 40px;">
                      <h1 style="color: #f59e0b; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px;">MakanSedap</h1>
                      <div style="display: inline-block; background-color: #ecfdf5; color: #059669; font-weight: 600; padding: 6px 16px; border-radius: 9999px; font-size: 14px; margin-top: 16px;">
                        Payment Successful
                      </div>
                    </div>
                    
                    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 32px; border: 1px solid #e2e8f0;">
                      <p style="margin: 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Order ID</p>
                      <p style="margin: 8px 0 0 0; color: #0f172a; font-weight: 700; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 15px;">{order_id}</p>
                    </div>
                    
                    <h3 style="color: #0f172a; margin-bottom: 20px; font-size: 18px; font-weight: 700; padding-left: 8px;">Order Summary</h3>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
                      {html_items}
                      <tr>
                        <td style="padding: 24px 16px; color: #64748b; font-weight: 500; font-size: 16px;">Total Paid</td>
                        <td style="padding: 24px 16px; text-align: right; color: #f59e0b; font-weight: 800; font-size: 20px;">RM {total:.2f}</td>
                      </tr>
                    </table>
                    
                    <div style="text-align: center; margin-top: 40px; padding-top: 32px; border-top: 2px dashed #e2e8f0;">
                      <p style="color: #334155; font-size: 16px; font-weight: 600; margin: 0;">Your food is currently being prepared! 🍳</p>
                      <p style="color: #94a3b8; font-size: 14px; margin-top: 12px; margin-bottom: 0;">Thank you for dining with MakanSedap.</p>
                    </div>
                    
                  </div>
                </div>
                '''
                
                send_mail(
                    subject=f"Receipt for Order #{order_id[:8]}",
                    message=msg,
                    from_email=settings.EMAIL_HOST_USER,
                    recipient_list=[customer_email],
                    fail_silently=False,  # Set to False to see errors in logs
                    html_message=html_msg,
                )
                print(f"✅ Success: Email sent to {customer_email}")
            else:
                print(f"⚠️ Email skipped: Missing email or EMAIL_HOST_USER")
        except Exception as email_err:
            import traceback
            print(f"❌ Failed to send email receipt: {email_err}")
            traceback.print_exc()

        return JsonResponse({"success": True, "orderId": order_id, "status": "paid"})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


# =========================
# ANALYTICS  (from Firestore)
# =========================

@csrf_exempt
@require_http_methods(["GET"])
def analytics(request):
    db = _get_db()

    # ── Orders ──
    order_docs = list(db.collection("orders").stream())
    total_orders = len(order_docs)
    total_revenue = 0
    category_sales_map = {}
    daily_orders_map = {}

    for odoc in order_docs:
        odata = odoc.to_dict()
        items = odata.get("items", [])
        for it in items:
            qty = it.get("qty", it.get("quantity", 1))
            price = float(it.get("price", 0))
            total_revenue += price * qty

            cat = it.get("category", "Other") or "Other"
            category_sales_map[cat] = category_sales_map.get(cat, 0) + price * qty

        # Daily breakdown
        created = odata.get("createdAt")
        if created:
            try:
                day_label = created.strftime("%a")
            except Exception:
                day_label = "N/A"
            daily_orders_map[day_label] = daily_orders_map.get(day_label, 0) + 1

    # ── Menu item count ──
    menu_docs = list(db.collection("menuItems").stream())

    avg_order_value = round(total_revenue / total_orders, 2) if total_orders else 0

    analytics_data = {
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
        "menu_items": len(menu_docs),
        "avg_order_value": avg_order_value,
        "daily_orders": [
            {"date": day, "count": count}
            for day, count in daily_orders_map.items()
        ],
        "category_sales": [
            {"category": cat, "sales": round(sales, 2)}
            for cat, sales in category_sales_map.items()
        ],
    }

    return JsonResponse(analytics_data)

@api_view(['GET'])
def test_email(request):
    """Diagnostic endpoint to test SMTP settings."""
    from django.core.mail import send_mail
    if not getattr(settings, "EMAIL_HOST_USER", None):
        return JsonResponse({"error": "EMAIL_HOST_USER not configured"}, status=500)
    
    try:
        send_mail(
            subject="Diagnostic: MakanSedap SMTP Test",
            message="This is a test email from your MakanSedap backend. If you see this, SMTP is working!",
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[settings.EMAIL_HOST_USER],
            fail_silently=False,
        )
        return JsonResponse({"success": True, "message": f"Test email sent to {settings.EMAIL_HOST_USER}"})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)