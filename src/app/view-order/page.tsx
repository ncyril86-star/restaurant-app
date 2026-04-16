'use client';

import { useEffect, useState, Suspense } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Minus, X, Sparkles } from 'lucide-react';

function normalizeImageUrl(raw: string): string {
  const url = raw.trim();
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

function ViewOrderPage() {
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const initialCategory = (searchParams.get('category') || 'all').toLowerCase();
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastItem, setToastItem] = useState('');

  useEffect(() => {
    const cat = (searchParams.get('category') || 'all').toLowerCase();
    setSelectedCategory(cat);
  }, [searchParams]);

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

        // Fetch menu items to get latest details
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

        setOrderItems(resolved as any[]);
      } catch (err) {
        console.error('Failed to load cart:', err);
      } finally {
        setLoading(false);
      }
    };
    loadLocalCart();
  }, []);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        // Assuming you have a 'menu' collection in Firestore
        const { collection, getDocs, limit, query } = await import('firebase/firestore');
        const menuRef = collection(db, 'menuItems'); // Change 'items' to your menu collection name
        const q = query(menuRef, limit(4)); // Fetch 4 random/top items
        const snap = await getDocs(q);
        
        const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecommendations(items);
      } catch (error) {
        console.error("Error fetching recommendations:", error);
      }
    };
    fetchRecommendations();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch(err => console.warn('Anonymous sign-in failed:', err));
      }
    });

    return () => unsub();
  }, []);

  const syncToStorage = (items: any[]) => {
    const cartMap: { [k: string]: number } = {};
    items.forEach(it => {
      if (it.id) cartMap[it.id] = it.qty;
    });
    localStorage.setItem('localCart', JSON.stringify(cartMap));
  };

  const incrementItem = (item: any) => {
    setOrderItems(prev => {
      const existing = [...prev];
      const idx = existing.findIndex((it: any) => it.id === item.id);
      let newItems;
      if (idx >= 0) {
        existing[idx].qty = (existing[idx].qty || 0) + 1;
        newItems = existing;
      } else {
        newItems = [...existing, { ...item, qty: 1 }];
      }
      syncToStorage(newItems);
      return newItems;
    });
  };

  const decrementItem = (item: any) => {
    setOrderItems(prev => {
      const existing = [...prev];
      const idx = existing.findIndex((it: any) => it.id === item.id);
      if (idx >= 0) {
        existing[idx].qty = Math.max(0, (existing[idx].qty || 0) - 1);
        if (existing[idx].qty === 0) existing.splice(idx, 1);
        syncToStorage(existing);
        return [...existing];
      }
      return prev;
    });
  };

  const removeItem = (item: any) => {
    setOrderItems(prev => {
      const filtered = prev.filter(it => it.id !== item.id);
      syncToStorage(filtered);
      return filtered;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-white flex items-center justify-center">
        <p className="text-xl font-semibold animate-pulse text-amber-400">Loading order...</p>
      </div>
    );
  }

  const categories = [
    { key: 'all', label: 'All' },
    { key: 'main', label: 'Main Dish' },
    { key: 'drinks', label: 'Drinks' },
    { key: 'dessert', label: 'Dessert' },
  ];

  // Removed orderItems reassignment
  const filteredOrderItems = orderItems.filter((item) => {
    if (selectedCategory === 'all') return true;
    const cat = (item as any).category;
    if (!cat) return false;
    const c = String(cat).toLowerCase();
    return c.includes(selectedCategory.toLowerCase()) || c === selectedCategory.toLowerCase();
  });

  const totalPrice = orderItems.reduce((sum, it) => {
    const price = Number(it.price || it.unit_price || 0) || 0;
    const qty = Number(it.qty || it.quantity || 0) || 0;
    return sum + price * qty;
  }, 0);

  const counts = {
    all: orderItems.length,
    main: orderItems.filter((item) => {
      const cat = (item as any).category;
      return cat && String(cat).toLowerCase().includes('main');
    }).length,
    drinks: orderItems.filter((item) => {
      const cat = (item as any).category;
      return cat && String(cat).toLowerCase().includes('drink');
    }).length,
    dessert: orderItems.filter((item) => {
      const cat = (item as any).category;
      return cat && String(cat).toLowerCase().includes('dessert');
    }).length,
  };

  return (
    <>
      {/* Injecting the custom CSS animation directly into the component */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translate(-50%, -15px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>

      <div className="min-h-screen bg-[#0b0f19] text-white overflow-x-hidden pb-24">
        {/* Header with Perfect Centering */}

        <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8 lg:pt-12">
          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">Shopping Cart</h1>

          <div className="mt-8 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-12 xl:gap-x-16">
            {/* Left Column: Cart Items */}
            <section className="lg:col-span-7 xl:col-span-8">
              
              <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-white/10 pb-6">
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all focus:outline-none inline-flex items-center gap-2 ` +
                      (selectedCategory === cat.key
                        ? 'bg-amber-400 text-black shadow-[0_4px_14px_rgba(245,158,11,0.15)]'
                        : 'bg-white/5 text-white/80 hover:bg-white/10')
                    }
                  >
                    <span className="select-none">{cat.label}</span>
                    <span className={`ml-1 inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold leading-none border ${
                        selectedCategory === cat.key ? 'border-transparent bg-gray-800 text-white' : 'border-white/20 bg-white/5 text-white/80'
                      }`}
                    >
                      {counts[cat.key as keyof typeof counts]}
                    </span>
                  </button>
                ))}
              </div>

              {orderItems.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
                  <p className="text-white/80 text-lg">Your cart is empty.</p>
                  <Link 
                    href={`/menu`}
                    className="mt-4 inline-block text-amber-400 font-semibold hover:text-amber-300 transition-colors"
                  >
                    Continue Browsing &rarr;
                  </Link>
                </div>
              ) : (
                <ul role="list" className="divide-y divide-white/10 border-b border-white/10 pb-6">
                  {filteredOrderItems.map((item: any) => (
                    <li key={item.id || item.name} className="flex py-6 sm:py-8">
                      {/* Item Image */}
                      <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 sm:h-32 sm:w-32">
                        <img
                          src={normalizeImageUrl(String(item.image || item.img || ''))}
                          alt={item.name}
                          className="h-full w-full object-cover object-center"
                          onError={(e) => { e.currentTarget.src = "https://placehold.co/400x400?text=Food"; }}
                        />
                      </div>

                      {/* Item Details with Aligned Quantity & Price */}
                      <div className="ml-4 flex flex-1 flex-col justify-between sm:ml-6 relative">
                        <div className="pr-9">
                          <h3 className="text-lg font-bold text-white">
                            {item.name}
                          </h3>
                          {item.description && (
                            <p className="mt-1 text-sm text-white/60 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div className="absolute right-0 top-0">
                          <button
                            type="button"
                            onClick={() => removeItem(item)}
                            className="-m-2 p-2 inline-flex text-white/40 hover:text-red-400 transition-colors"
                          >
                            <span className="sr-only">Remove</span>
                            <X size={20} strokeWidth={2.5} />
                          </button>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <p className="text-amber-400 font-bold text-lg">
                            RM {Number(item.price || item.unit_price || 0).toFixed(2)}
                          </p>

                          <div className="flex items-center gap-2 bg-[#1a1f2e] rounded-lg p-1 border border-white/10 shadow-inner">
                            <button
                              onClick={() => decrementItem(item)}
                              className="flex h-8 w-8 items-center justify-center rounded-md bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <Minus size={16} strokeWidth={2.5} />
                            </button>
                            <span className="w-8 text-center text-sm font-semibold text-white">
                              {item.qty || item.quantity || 0}
                            </span>
                            <button
                              onClick={() => incrementItem(item)}
                              className="flex h-8 w-8 items-center justify-center rounded-md bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <Plus size={16} strokeWidth={2.5} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Right Column: Order Summary */}
            {orderItems.length > 0 && (
              <section className="mt-16 rounded-2xl border border-white/10 bg-white/5 px-6 py-6 sm:p-8 lg:col-span-5 xl:col-span-4 lg:mt-[60px] lg:sticky lg:top-24">
                <h2 className="text-lg font-bold text-white">Order summary</h2>

                <dl className="mt-6 space-y-4 text-sm text-white/80">
                  <div className="flex items-center justify-between">
                    <dt>Subtotal</dt>
                    <dd className="font-medium text-white">RM {totalPrice.toFixed(2)}</dd>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-white/10 pt-4">
                    <dt className="text-base font-bold text-white">Order total</dt>
                    <dd className="text-xl font-bold text-amber-400">RM {totalPrice.toFixed(2)}</dd>
                  </div>
                </dl>

                <div className="mt-8">
                  <Link
                    href={`/checkout`}
                    className="w-full inline-block text-center rounded-full border border-[#d4af37]/80 bg-transparent px-4 py-3.5 text-base font-extrabold text-[#d4af37] shadow-[0_10px_30px_rgba(212,175,55,0.15)] hover:bg-[#d4af37]/10 focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:ring-offset-2 focus:ring-offset-[#0b0f19] transition-all tracking-[0.2em]"
                    style={{ fontFamily: "'Cormorant Garamond', 'Baskerville', 'Times New Roman', serif" }}
                  >
                    CHECKOUT
                  </Link>
                </div>
                
                <div className="mt-4 text-center">
                  <Link 
                    href={`/menu`}
                    className="text-sm font-medium text-white/60 hover:text-white transition-colors"
                  >
                    or Continue Browsing
                  </Link>
                </div>
              </section>
            )}
          </div>
          
          <section className="mt-24 border-t border-white/10 pt-16 mb-12">
            <div className="flex items-center gap-2 mb-8">
              <Sparkles className="text-amber-400" size={24} />
              <h2 className="text-2xl font-bold tracking-tight text-white">
                You may also like...
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-4 lg:gap-x-8">
              {recommendations.length > 0 ? (
                recommendations.map((item) => (
                  <div
                    key={item.id}
                    className="group relative flex flex-col h-full"
                  >
                    {/* Image */}
                    <div className="w-full aspect-square overflow-hidden rounded-2xl bg-white/5 border border-white/10 group-hover:opacity-75 transition-opacity">
                      <img
                        src={normalizeImageUrl(item.image || item.img || '')}
                        alt={item.name}
                        className="h-full w-full object-cover object-center"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://placehold.co/400x400?text=Food";
                        }}
                      />
                    </div>

                    {/* Content */}
                    <div className="mt-4 flex flex-col flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-sm font-semibold text-white">
                            {item.name}
                          </h3>
                          <p className="mt-1 text-xs text-white/40 capitalize">
                            {item.category || "Specialty"}
                          </p>
                        </div>

                        {/* + Button */}
                        <button
                          onClick={() => {
                            incrementItem(item);
                            setToastItem(item.name);
                            setShowToast(true);

                            setTimeout(() => {
                              setShowToast(false);
                            }, 2000);
                          }}
                          className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-black hover:bg-amber-300 active:scale-95 transition-all shadow-md"
                        >
                          <Plus size={16} strokeWidth={3} />
                        </button>
                      </div>

                      {/* Price */}
                      <p className="mt-2 text-sm font-bold text-amber-400">
                        RM {Number(item.price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                [1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse flex flex-col">
                    <div className="aspect-square w-full rounded-2xl bg-white/5 mb-4" />
                    <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-white/5 rounded w-1/4 mb-2" />
                    <div className="h-8 w-8 rounded-full bg-white/10" />
                  </div>
                ))
              )}
            </div>
          </section>

          {showToast && (
            /* Changed 'bottom-6' to 'top-20' (to clear your sticky header) and bumped z-index to z-[60] */
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60]">
              {/* Changed the animation class to our new 'animate-fade-in-top' */}
              <div className="bg-green-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-semibold animate-fade-in-top">
                ✔ {toastItem} added to cart
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export default function ViewOrderPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-white">Loading order...</div>}>
      <ViewOrderPage />
    </Suspense>
  );
}