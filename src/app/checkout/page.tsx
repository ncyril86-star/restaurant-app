"use client";

import { useEffect, useState, Suspense } from "react";
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Minus } from 'lucide-react';

function normalizeImageUrl(raw: string): string {
  const url = String(raw || '').trim();
  if (!url) return url;
  try {
    const u = new URL(url);
    if (u.hostname === 'unsplash.com') {
      const parts = u.pathname.split('/').filter(Boolean);
      const photosIdx = parts.indexOf('photos');
      if (photosIdx >= 0 && parts[photosIdx + 1]) {
        const slug = parts[photosIdx + 1];
        const id = slug.split('-').pop();
        if (id) return `https://unsplash.com/photos/${id}/download?force=true&w=400`;
      }
    }
  } catch { }
  return url;
}

function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderIdParam = searchParams.get('orderId') || '';
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'fpx' | 'counter'>('fpx');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string, show: boolean }>({ message: '', show: false });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) signInAnonymously(auth).catch(() => { });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const loadLocalCart = async () => {
      setLoading(true);
      try {
        const storedCart = localStorage.getItem('localCart');
        if (!storedCart) {
          setOrderItems([]);
          setLoading(false);
          return;
        }

        const cartMap = JSON.parse(storedCart);
        const itemIds = Object.keys(cartMap);

        if (itemIds.length === 0) {
          setOrderItems([]);
          setLoading(false);
          return;
        }

        // Fetch menu items to get latest prices/names/images
        const { collection, getDocs } = await import('firebase/firestore');
        const snap = await getDocs(collection(db, 'menuItems'));
        const allItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        const resolved = itemIds.map(id => {
          const base = allItems.find(it => it.id === id);
          if (!base) return null;
          return {
            ...base,
            qty: cartMap[id]
          };
        }).filter(Boolean);

        setOrderItems(resolved);
      } catch (err) {
        console.error('Failed to load cart:', err);
      } finally {
        setLoading(false);
      }
    };
    loadLocalCart();
  }, []);

  const total = orderItems.reduce((s, it) => {
    const price = Number(it.price || it.unit_price || 0) || 0;
    const qty = Number(it.qty || it.quantity || 0) || 0;
    return s + price * qty;
  }, 0);

  const pay = async () => {
    if (!orderItems.length) {
      setToast({ message: 'No items in order', show: true });
      setTimeout(() => setToast({ message: '', show: false }), 2000);
      return;
    }

    if (!tableNumber.trim()) {
      setToast({ message: 'Table number is required', show: true });
      setTimeout(() => setToast({ message: '', show: false }), 2000);
      return;
    }

    setProcessing(true);

    try {
      // 1. Create the order document if Pay at Counter
      let finalOrderId = '';

      if (paymentMethod === 'counter') {
        const { collection, addDoc } = await import('firebase/firestore');
        const colRef = collection(db, 'orders');
        const docRef = await addDoc(colRef, {
          items: orderItems,
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          tableNumber: tableNumber,
          total: total,
          status: 'pending_counter', // Initial status for counter
          paymentMethod: 'counter',
          createdAt: serverTimestamp(),
        });
        finalOrderId = docRef.id;

        // Redirect to success
        if (typeof window !== 'undefined') {
          localStorage.removeItem('localCart');
          window.dispatchEvent(new Event('cartUpdated'));
        }
        router.push(`/success?orderId=${finalOrderId}&paymentMethod=counter`);
        return;
      }

      // 2. Stripe / FPX flow
      // We pass the cart items to the session creation API
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderItems,
          email: email,
          customerName: name,
          customerPhone: phone,
          tableNumber: tableNumber,
          paymentMethod: 'fpx'
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      // Redirect the user to the secure Stripe payment screen
      if (data.url) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('localCart');
          window.dispatchEvent(new Event('cartUpdated'));
        }
        window.location.href = data.url;
      }

    } catch (err) {
      console.error('Payment failed', err);
      setToast({ message: 'Failed to connect to Stripe', show: true });
      setTimeout(() => setToast({ message: '', show: false }), 3000);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-white flex items-center justify-center">
        <p className="text-xl font-semibold animate-pulse text-amber-400">Loading checkout...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white pb-24">

      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold text-white mb-6">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-7 rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-bold text-white mb-4">Payment</h2>

            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input type="radio" name="pm" checked={paymentMethod === 'fpx'} onChange={() => setPaymentMethod('fpx')} className="accent-amber-400" />
                <span>FPX (online banking)</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="radio" name="pm" checked={paymentMethod === 'counter'} onChange={() => setPaymentMethod('counter')} className="accent-amber-400" />
                <span>Pay at Counter</span>
              </label>
            </div>

            <div className="mt-6">
              <h3 className="text-sm text-white/80 mb-2">Customer</h3>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full rounded-lg bg-[#0f1724] border border-white/6 px-4 py-2 text-white mb-3" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email address (for receipt)" className="w-full rounded-lg bg-[#0f1724] border border-white/6 px-4 py-2 text-white mb-3" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="w-full rounded-lg bg-[#0f1724] border border-white/6 px-4 py-2 text-white mb-3" />
              <input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} placeholder="Table Number" required className="w-full rounded-lg bg-[#0f1724] border border-white/6 px-4 py-2 text-white mb-3" />
            </div>

            <div className="mt-6">
              <h3 className="text-sm text-white/80 mb-2">Payment notice</h3>
              <p className="text-sm text-white/70">
                {paymentMethod === 'counter'
                  ? "Your order will be sent to the kitchen. Please pay at the counter."
                  : "You'll be redirected to your bank to complete the payment."}
              </p>
            </div>

            <div className="mt-6">
              <button disabled={processing} onClick={pay} className="w-full rounded-full bg-amber-400 px-4 py-3.5 text-base font-extrabold text-black shadow-[0_10px_30px_rgba(245,158,11,0.2)] hover:bg-amber-300">
                {processing ? 'Processing…' : `Pay RM ${total.toFixed(2)}`}
              </button>
            </div>
          </section>

          <aside className="lg:col-span-5 rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-bold text-white mb-4">Order summary</h2>
            {orderItems.length === 0 ? (
              <p className="text-white/80">No items in order.</p>
            ) : (
              <ul className="space-y-4">
                {orderItems.map((it) => (
                  <li key={it.id || it.name} className="flex items-center gap-3">
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-white/5 border border-white/6">
                      <img src={normalizeImageUrl(it.image || it.img || '')} alt={it.name} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.src = 'https://placehold.co/200x200?text=Food' }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div>
                          <div className="font-semibold text-white">{it.name}</div>
                          <div className="text-xs text-white/60">Qty: {it.qty || it.quantity || 0}</div>
                        </div>
                        <div className="font-semibold text-amber-400">RM {(Number(it.price || it.unit_price || 0) * (it.qty || it.quantity || 0)).toFixed(2)}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/80">Subtotal</div>
                <div className="font-medium text-white">RM {total.toFixed(2)}</div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="text-sm text-white/80">Total</div>
                <div className="font-bold text-amber-400 text-lg">RM {total.toFixed(2)}</div>
              </div>
            </div>
          </aside>
        </div>

        {toast.show && (
          <div className="fixed bottom-8 right-8 z-50">
            <div className="rounded-full bg-green-600 text-white px-4 py-2 font-semibold">{toast.message}</div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CheckoutPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b1120] flex items-center justify-center text-white">Loading checkout...</div>}>
      <CheckoutPage />
    </Suspense>
  );
}
