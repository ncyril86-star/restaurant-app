import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_build_placeholder');
  try {
    console.log('🔴 ROUTE CALLED');
    
    const { items, email, customerName, customerPhone } = await request.json();
    console.log('🔴 Customer Email:', email);
    console.log('🔴 Items Count:', items?.length);

    if (!items || !items.length) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 });
    }

    const total = items.reduce((sum: number, item: any) => {
      const price = Number(item.price || item.unit_price || 0) || 0;
      const qty = Number(item.qty || item.quantity || 0) || 0;
      return sum + price * qty;
    }, 0);

    console.log('🔴 Total:', total);

    // Prepare metadata (Stripe limit: 500 chars per value)
    // We store only IDs and quantities to save space
    const cartData = items.map((it: any) => `${it.id}:${it.qty || it.quantity || 1}`).join(',');

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card', 'fpx', 'grabpay'],
      line_items: [
        {
          price_data: {
            currency: 'myr',
            product_data: { 
              name: `Restaurant Order`,
              description: `${items.length} item(s)`
            },
            unit_amount: Math.round(total * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        customerName: customerName || '',
        customerPhone: customerPhone || '',
        customerEmail: email || '',
        cartData: cartData.substring(0, 500),
      },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout`,
    };

    if (email) {
      sessionConfig.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('🔴 Session created:', session.id);
    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error('🔴 ERROR:', error);
    console.error('🔴 Error type:', error instanceof Error ? error.constructor.name : typeof error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' }, 
      { status: 500 }
    );
  }
}