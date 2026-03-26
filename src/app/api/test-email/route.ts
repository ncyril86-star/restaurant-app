import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const djangoBaseUrl = process.env.DJANGO_API_URL || 'http://127.0.0.1:8000';
    const djangoRes = await fetch(`${djangoBaseUrl}/api/test-email/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!djangoRes.ok) {
      const errText = await djangoRes.text();
      return NextResponse.json({ error: 'Backend diagnostic failed', details: errText }, { status: djangoRes.status });
    }

    const data = await djangoRes.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server proxy error', details: error.message }, { status: 500 });
  }
}
