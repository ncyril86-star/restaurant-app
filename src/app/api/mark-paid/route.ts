import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { orderId, sessionId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Call the Django backend from the Node.js server to avoid browser CORS/blocks
    const djangoBaseUrl = process.env.DJANGO_API_URL || 'http://127.0.0.1:8000';
    const djangoRes = await fetch(`${djangoBaseUrl}/api/orders/${orderId}/pay/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stripeSessionId: sessionId || '',
        paymentMethod: 'stripe',
      }),
    });

    if (!djangoRes.ok) {
      const errText = await djangoRes.text();
      console.error('Django API error:', errText);
      return NextResponse.json({ error: 'Failed to update order in backend' }, { status: djangoRes.status });
    }

    const data = await djangoRes.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in mark-paid route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
