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
import threading


# ── Firebase init ────────────────────────────────────────────────
def _get_db():
    """Return a Firestore client, initialising the app on first call."""
    if not firebase_admin._apps:
        # 1. Try environment variable with raw JSON content
        cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
        if cred_json:
            try:
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


def _send_receipt_email_async(order_id, customer_email, order_data, data):
    """Background task to send email without blocking the main response."""
    try:
        print(f"📧 [EMAIL_THREAD] Starting for order {order_id} to {customer_email}")
        
        if not customer_email or not settings.EMAIL_HOST_USER:
            print("📧 [EMAIL_THREAD] Skipped: No email or host user configured")
            return

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
        
        # HTML Receipt
        html_msg = f'''
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 16px; background-color: #f9fafb;">
          <div style="background-color: white; border-radius: 16px; padding: 40px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #f3f4f6;">
            <div style="text-align: center; margin-bottom: 40px;">
              <h1 style="color: #f59e0b; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px;">MakanSedap</h1>
              <div style="display: inline-block; background-color: #ecfdf5; color: #059669; font-weight: 600; padding: 6px 16px; border-radius: 9999px; font-size: 14px; margin-top: 16px;">Payment Successful</div>
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
        
        print(f"📧 [EMAIL_THREAD] Sending email via {settings.EMAIL_HOST}:{settings.EMAIL_PORT}...")
        send_mail(
            subject=f"Receipt for Order #{order_id[:8]}",
            message=msg,
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[customer_email],
            fail_silently=False, 
            html_message=html_msg,
        )
        print(f"✅ [EMAIL_THREAD] Successfully sent to {customer_email}")

    except Exception as email_err:
        import traceback
        print(f"❌ [EMAIL_THREAD] Failed to send to {customer_email}: {email_err}")
        traceback.print_exc()


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

        pm = data.get("paymentMethod", "stripe")
        status = "paid"
        if pm == "counter":
            status = "pending_counter"

        doc_ref.update({
            "status": status,
            "paidAt": SERVER_TIMESTAMP if status == "paid" else None,
            "stripeSessionId": data.get("stripeSessionId", ""),
            "paymentMethod": pm,
        })

        # Try to send an email receipt in a background thread
        try:
            order_data = doc.to_dict()
            # Prioritize email passed in request, then order data
            customer_email = data.get("customerEmail") or order_data.get("customerEmail")
            
            if customer_email:
                print(f"🚀 [MARK_PAID] Triggering email thread for {customer_email}")
                thread = threading.Thread(
                    target=_send_receipt_email_async,
                    args=(order_id, customer_email, order_data, data)
                )
                thread.daemon = True
                thread.start()
            else:
                print("⚠️ [MARK_PAID] No customer email found, skipping receipt.")
        except Exception as trigger_err:
            print(f"❌ [MARK_PAID] Error triggering email thread: {trigger_err}")

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
    item_sales_map = {}  # Track top selling items
    item_image_map = {}  # Track images for those items

    from datetime import datetime, date
    today_date = date.today()
    today_sales = []
    all_sales = []

    for odoc in order_docs:
        odata = odoc.to_dict()
        items = odata.get("items", [])
        created = odata.get("createdAt")
        
        is_today = False
        if created:
            # Firestore timestamps usually have a .date() method or can be converted
            try:
                if created.date() == today_date:
                    is_today = True
            except AttributeError:
                 # Fallback if it's already a date or different type
                 pass

        for it in items:
            qty = it.get("qty", it.get("quantity", 1))
            price = float(it.get("price", 0))
            name = it.get("name", "Unknown Item")
            img = it.get("image")
            total_revenue += price * qty

            cat = it.get("category", "Other") or "Other"
            category_sales_map[cat] = category_sales_map.get(cat, 0) + price * qty

            # Item sales (by quantity)
            item_sales_map[name] = item_sales_map.get(name, 0) + qty
            if img:
                item_image_map[name] = img
            
            # If the order was today, add to today's sales list
            if is_today:
                today_sales.append({
                    "name": name,
                    "qty": qty,
                    "price": price,
                    "time": created.strftime("%H:%M") if created else "N/A"
                })
            
            # Collected for all-time historical view
            all_sales.append({
                "orderId": order_id, # Added orderId here
                "name": name,
                "qty": qty,
                "price": price,
                "date": created.strftime("%Y-%m-%d %H:%M") if created else "N/A"
            })

        # Daily breakdown
        if created:
            try:
                day_label = created.strftime("%a")
            except Exception:
                day_label = "N/A"
            daily_orders_map[day_label] = daily_orders_map.get(day_label, 0) + 1

    # ── Top Items ──
    sorted_items = sorted(item_sales_map.items(), key=lambda x: x[1], reverse=True)
    top_items = [
        {"name": name, "sales": sales, "image": item_image_map.get(name)} 
        for name, sales in sorted_items[:5]
    ]

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
        "top_items": top_items,
        "today_sales": today_sales,
        "all_sales": all_sales,
    }

    return JsonResponse(analytics_data)


@csrf_exempt
@require_http_methods(["GET"])
def db_check(request):
    """Diagnostic endpoint to check Firestore content from Render."""
    try:
        db = _get_db()
        results = {}
        for coll in ["orders", "menuItems", "menu_items", "categories", "reviews"]:
            docs = list(db.collection(coll).limit(1).stream())
            results[coll] = {
                "count_hint": "Exists" if docs else "Empty/Missing",
                "sample": docs[0].to_dict() if docs else None
            }
        return JsonResponse({"status": "connected", "database": results})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def test_email(request):
    """Enhanced Diagnostic endpoint to test SMTP settings and find hidden env keys."""
    from django.core.mail import send_mail
    
    # Key Finder: List environment keys starting with EMAIL, HOST, or SMTP
    env_keys = sorted(os.environ.keys())
    potential_keys = [k for k in env_keys if any(x in k.upper() for x in ["EMAIL", "HOST", "SMTP", "USER", "PASS"])]
    
    settings_debug = {
        "EMAIL_HOST": settings.EMAIL_HOST,
        "EMAIL_PORT": settings.EMAIL_PORT,
        "EMAIL_USE_TLS": settings.EMAIL_USE_TLS,
        "EMAIL_USE_SSL": settings.EMAIL_USE_SSL,
        "EMAIL_HOST_USER": settings.EMAIL_HOST_USER,
    }
    
    if not getattr(settings, "EMAIL_HOST_USER", None) or not settings.EMAIL_HOST_USER:
        return JsonResponse({
            "error": "EMAIL_HOST_USER is empty in settings", 
            "hint": "Check if your environment variable name has any leading/trailing spaces or typos.",
            "available_env_keys": potential_keys,
            "settings_detected": settings_debug
        }, status=500)
    
    try:
        send_mail(
            subject="Diagnostic: MakanSedap SMTP Test",
            message="This is a test email from your MakanSedap backend. If you see this, SMTP is working!",
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[settings.EMAIL_HOST_USER],
            fail_silently=False,
        )
        return JsonResponse({
            "success": True, 
            "message": "Email sent!", 
            "settings": settings_debug,
            "env_keys_found": potential_keys
        })
    except Exception as e:
        import traceback
        return JsonResponse({
            "success": False, 
            "error": str(e), 
            "trace": traceback.format_exc(),
            "settings": settings_debug,
            "env_keys_found": potential_keys
        }, status=500)