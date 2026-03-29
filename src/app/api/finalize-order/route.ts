import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // 1. Retrieve the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session || session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // 2. Check if an order for this session already exists (prevent duplicates)
    const q = query(collection(db, 'orders'), where('stripeSessionId', '==', sessionId));
    const existingSnap = await getDocs(q);
    if (!existingSnap.empty) {
      const existingId = existingSnap.docs[0].id;
      return NextResponse.json({ orderId: existingId, status: 'already_exists' });
    }

    // 3. Extract metadata and resolve items
    const metadata = session.metadata || {};
    const cartData = metadata.cartData || ''; // "ID:QTY,ID:QTY"
    
    if (!cartData) {
      return NextResponse.json({ error: 'No cart data in session' }, { status: 400 });
    }

    // Resolve items from Firestore menuItems collection
    const menuSnap = await getDocs(collection(db, 'menuItems'));
    const allMenuItems = menuSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const resolvedItems = cartData.split(',').map(pair => {
      const [id, qtyStr] = pair.split(':');
      const base = allMenuItems.find(it => it.id === id);
      if (!base) return null;
      return {
        id: id,
        name: (base as any).name || 'Unknown Item',
        price: Number((base as any).price || 0),
        qty: parseInt(qtyStr) || 1,
        image: (base as any).image || null,
      };
    }).filter(Boolean);

    // 4. Create the Firestore order
    const orderData = {
      items: resolvedItems,
      customerName: metadata.customerName || '',
      customerEmail: metadata.customerEmail || session.customer_email || '',
      customerPhone: metadata.customerPhone || '',
      tableNumber: metadata.tableNumber || '',
      total: (session.amount_total || 0) / 100,
      status: 'paid',
      paymentMethod: 'fpx', 
      stripeSessionId: sessionId,
      createdAt: serverTimestamp(),
      paidAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'orders'), orderData);
    const orderId = docRef.id;

    // 5. Proxy to Django to send email receipt
    const djangoBaseUrl = process.env.DJANGO_API_URL || 'http://127.0.0.1:8000';
    const targetUrl = `${djangoBaseUrl}/api/orders/${orderId}/pay/`;
    
    await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stripeSessionId: sessionId,
        paymentMethod: 'fpx',
        customerEmail: orderData.customerEmail,
      }),
    });

    return NextResponse.json({ orderId: orderId, status: 'created' });

  } catch (error) {
    console.error('Finalize Order Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
