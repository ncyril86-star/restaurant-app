'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { Star, MessageSquarePlus, User, Loader2, Receipt } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { Suspense } from 'react';

function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  
  // Modal State
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [linkedOrder, setLinkedOrder] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('localCart');
      if (stored) {
        setCart(JSON.parse(stored));
      }
    }
  }, []);

  // Fetch linked order if orderId is present
  useEffect(() => {
    if (orderId) {
      const fetchOrder = async () => {
        try {
          const docRef = doc(db, 'orders', orderId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setLinkedOrder({ id: snap.id, ...data });
            if (data.customerName) setName(data.customerName);
            setShowModal(true); // Auto-open modal if linked to an order
          }
        } catch (err) {
          console.error('Failed to fetch order for review:', err);
        }
      };
      fetchOrder();
    }
  }, [orderId]);

  useEffect(() => {
    // Only fetch reviews that are NOT hidden
    const q = query(
      collection(db, 'reviews'),
      where('status', '!=', 'hidden'),
      orderBy('createdAt', 'desc') // Requires a composite index if combining where & orderBy, wait actually if status != hidden it might need an index. To be safe, let's just fetch all and filter client side OR use a simpler query.
    );
    
    // Simpler query to avoid immediate complex index requirement during demo:
    const simpleQ = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(simpleQ, (snap) => {
      const data = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((r: any) => r.status !== 'hidden'); // Filter out hidden reviews
      setReviews(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    setSubmitting(true);
    try {
      const reviewData: any = {
        customerName: name.trim() || 'Anonymous',
        rating,
        text: text.trim(),
        status: 'published',
        createdAt: serverTimestamp(),
      };

      // If linked to an order, include order metadata
      if (linkedOrder) {
        reviewData.orderId = linkedOrder.id;
        reviewData.orderItems = linkedOrder.items || [];
        reviewData.orderTotal = linkedOrder.total || 0;
        reviewData.orderCreatedAt = linkedOrder.createdAt || null;
      }

      await addDoc(collection(db, 'reviews'), reviewData);
      setShowModal(false);
      setName('');
      setText('');
      setRating(5);
      showToast('Review submitted successfully! Thank you.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Failed to submit review. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#0a0f18] pb-24">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg border ${
          toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
        } animate-in slide-in-from-top-4 fade-in duration-300 font-medium`}>
          {toast.message}
        </div>
      )}

      

      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0f19]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img 
              src="https://images.unsplash.com/photo-1644920437956-388353e26e28?q=80&w=627&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt="MakanSedap Logo"
              className="h-9 w-9 rounded-xl object-cover"
            />
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-wide text-amber-300">
                MakanSedap
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-white/80 md:flex">
            <Link className="hover:text-white transition-colors" href="/">Home</Link>
            <Link className="hover:text-white transition-colors" href="/#about">About</Link>
            
            {/* Dropdown Menu Container */}
            <div className="relative group py-2">
              <Link
                href="/menu"
                className="hover:text-white flex items-center gap-1 transition-colors"
              >
                Menu
              </Link>
            </div>

            <Link className="hover:text-white transition-colors" href="/#contact">Contact</Link>
            <Link className="hover:text-white transition-colors" href="/reviews">Reviews</Link>
          </nav>
          
          <div className="flex items-center gap-3">
            <Link
              href="/view-order"
              className="rounded-full bg-amber-400 px-4 py-2 text-sm font-extrabold text-black shadow-[0_10px_30px_rgba(245,158,11,0.25)] hover:bg-amber-300 transition-colors flex items-center gap-2"
            >
              View Order
              {Object.values(cart).reduce((a, b) => a + b, 0) > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-black/20 px-2 py-0.5 text-xs font-bold text-black border border-black/10">
                  {Object.values(cart).reduce((a, b) => a + b, 0)}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <div className="relative pt-24 pb-12 mb-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-[#0a0f18] z-0" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Wall of <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Love</span>
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8">
            Read what our amazing customers have to say about their dining experience with MakanSedap.
          </p>
          <button 
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-black px-8 py-4 rounded-xl font-bold text-lg hover:from-amber-300 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/25 hover:scale-105 active:scale-95"
          >
            <MessageSquarePlus className="w-5 h-5" />
            Write a Review
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes antigravity {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes antigravity-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes antigravity-fast {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .antigravity { animation: antigravity 2s ease-in-out infinite; }
        .antigravity-slow { animation: antigravity-slow 4s ease-in-out infinite; }
        .antigravity-fast { animation: antigravity-fast 3s ease-in-out infinite; }
      `}</style>

      {/* Reviews Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-4" />
            <p className="text-white/60">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
            <Star className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No reviews yet!</h3>
            <p className="text-white/60">Be the first to share your experience.</p>
          </div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {reviews.map((review, i) => {
              // Apply the same antigravity class to all cards so they float synchronously
              const floatClass = 'antigravity';
              
              return (
                <div 
                  key={review.id} 
                  className={`break-inside-avoid bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/[0.07] transition-all hover:scale-[1.02] ${floatClass}`}
                >
                  <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className={`w-4 h-4 ${star <= review.rating ? 'fill-amber-400 text-amber-400' : 'fill-white/10 text-white/10'}`} 
                    />
                  ))}
                </div>
                <p className="text-white/90 text-lg leading-relaxed mb-6 font-medium">"{review.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center border border-amber-500/30">
                    <User className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold">{review.customerName || 'Anonymous'}</h4>
                    <span className="text-xs text-white/40">
                      {review.createdAt?.toDate ? new Date(review.createdAt.toDate()).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'Just now'}
                    </span>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </main>

      {/* Write Review Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !submitting && setShowModal(false)} />
          <div className="relative w-full max-w-lg bg-[#0f1724] border border-white/10 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-extrabold text-white mb-2">Share your experience</h2>
            <p className="text-white/60 mb-8">What did you think of the food?</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Star Rating */}
              <div className="flex justify-center gap-2 mb-8">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star 
                      className={`w-10 h-10 transition-colors ${
                        star <= (hoverRating || rating) 
                          ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' 
                          : 'fill-white/5 text-white/20 hover:text-white/40'
                      }`} 
                    />
                  </button>
                ))}
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Your Name (optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Anonymous"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all font-medium"
                />
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Your Review *</label>
                <textarea
                  required
                  rows={4}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="The nasi lemak was absolutely incredible..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all font-medium resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !text.trim()}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-black bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Post Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewsPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0f18] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
      </div>
    }>
      <ReviewsPage />
    </Suspense>
  );
}
