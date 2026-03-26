'use client';

import { useEffect, useState, Suspense } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Receipt, ArrowLeft, Home, Download } from 'lucide-react';

function SuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || '';
  const sessionId = searchParams.get('session_id') || '';

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  // Ensure Firebase Auth is initialized and clear order from localStorage immediately
  useEffect(() => {
    // 1. Immediately clear the currentOrderId so they don't reuse it by accident
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentOrderId');
    }

    // 2. Auth handling
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch(() => {});
      } else {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // Fetch order and mark as paid via backend API
  useEffect(() => {
    if (!authReady || !orderId) { if (!orderId) setLoading(false); return; }

    const fetchAndUpdateOrder = async () => {
      try {
        // Fetch order data for display
        const ref = doc(db, 'orders', orderId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setOrder({ id: snap.id, ...data });

          // Mark order as paid via Next.js backend (proxies to Django)
          if (data.status !== 'paid') {
            const res = await fetch(`/api/mark-paid`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: orderId,
                sessionId: sessionId,
              }),
            });
            if (res.ok) {
              console.log('✅ Order marked as paid via backend');
            } else {
              console.error('❌ Failed to mark as paid API:', await res.text());
            }
          } else {
            // Order was already paid
          }
        }
      } catch (err: any) {
        console.error('Error updating order:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAndUpdateOrder();
  }, [authReady, orderId, sessionId]);

  const items: any[] = order?.items || [];
  const total = items.reduce((s, it) => {
    const price = Number(it.price || it.unit_price || 0) || 0;
    const qty = Number(it.qty || it.quantity || 0) || 0;
    return s + price * qty;
  }, 0);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-MY', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-MY', {
    hour: '2-digit', minute: '2-digit',
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-white flex items-center justify-center">
        <p className="text-xl font-semibold animate-pulse text-amber-400">Loading receipt...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0f19]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1644920437956-388353e26e28?q=80&w=627&auto=format&fit=crop"
              alt="logo"
              className="h-9 w-9 rounded-xl object-cover"
            />
            <p className="text-sm font-semibold tracking-wide text-amber-300">MakanSedap</p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 transition-all"
          >
            <Home size={16} />
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12">

        {/* Success animation */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-2xl scale-150" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-lg shadow-emerald-500/30">
              <CheckCircle size={40} className="text-white" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Payment Successful!</h1>
          <p className="mt-2 text-white/60 text-center">
            Thank you for your order. Your food is being prepared.
          </p>
        </div>

        {/* Receipt card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">

          {/* Receipt header */}
          <div className="bg-gradient-to-r from-amber-400/10 to-orange-500/10 border-b border-white/10 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-amber-400" />
                <h2 className="text-base font-bold text-white">Order Receipt</h2>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 uppercase">
                Paid
              </span>
            </div>
          </div>

          {/* Order info */}
          <div className="px-6 py-4 border-b border-white/10">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Order ID</p>
                <p className="font-mono text-white/90 text-xs">{orderId.substring(0, 16)}...</p>
              </div>
              <div className="text-right">
                <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Date & Time</p>
                <p className="text-white/90 text-xs">{dateStr}</p>
                <p className="text-white/60 text-xs">{timeStr}</p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">Items Ordered</p>
            <div className="space-y-3">
              {items.map((it, i) => {
                const price = Number(it.price || it.unit_price || 0);
                const qty = Number(it.qty || it.quantity || 0);
                return (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white/60">
                        {qty}x
                      </span>
                      <span className="text-sm text-white/90">{it.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-white/90">
                      RM {(price * qty).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totals */}
          <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">Subtotal</span>
              <span className="text-sm font-medium text-white/80">RM {total.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">Tax</span>
              <span className="text-sm font-medium text-white/80">RM 0.00</span>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-base font-bold text-white">Total Paid</span>
              <span className="text-xl font-extrabold text-amber-400">RM {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="px-6 py-4 border-t border-white/10 text-center">
            <p className="text-xs text-white/40">
              A confirmation has been sent to your account. Please keep this receipt for your records.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/reviews"
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 px-6 py-3 text-sm font-bold text-black hover:from-emerald-300 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/20"
          >
            Leave a Review
          </Link>
          <Link
            href={`/menu?orderId=`}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 text-sm font-bold text-black hover:from-amber-300 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/20"
          >
            Order Again
          </Link>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 transition-all"
          >
            <Home size={16} />
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function SuccessPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b1120] flex items-center justify-center text-white">Loading...</div>}>
      <SuccessPage />
    </Suspense>
  );
}
