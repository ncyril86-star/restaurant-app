'use client';

import { useEffect, useState, Suspense } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useSearchParams, useRouter } from 'next/navigation';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';
import { Plus, Minus } from 'lucide-react';

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

function MenuPage() {
  const [items, setItems] = useState<
    Array<{
      id: string;
      name?: string;
      description?: string;
      price?: number;
      image?: string;
      category?: string;
    }>
  >([]);

  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: '', show: false });
  
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const initialCategory = (searchParams.get('category') || 'all').toLowerCase();
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);

  useEffect(() => {
    const cat = (searchParams.get('category') || 'all').toLowerCase();
    setSelectedCategory(cat);
  }, [searchParams]);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "menuItems"));
        const menuData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setItems(menuData);
      } catch (error) {
        console.error("Error fetching menu:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch(err => {
          console.warn('Anonymous sign-in failed:', err);
        });
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const loadCartFromStorage = () => {
      try {
        const storedCart = localStorage.getItem('localCart');
        if (storedCart) {
          setCart(JSON.parse(storedCart));
        }
      } catch (err) {
        console.warn('Failed to load cart from storage:', err);
      }
    };
    loadCartFromStorage();
  }, []);

  const handleDecrement = (item: any) => {
    setCart((prev) => {
      const current = prev[item.id] || 0;
      const next = Math.max(0, current - 1);
      const newCart = { ...prev };
      if (next === 0) {
        delete newCart[item.id];
      } else {
        newCart[item.id] = next;
      }
      localStorage.setItem('localCart', JSON.stringify(newCart));
      window.dispatchEvent(new Event('cartUpdated'));
      return newCart;
    });
  };

  const showToast = (message: string, ms = 1800) => {
    setToast({ message, show: true });
    setTimeout(() => setToast({ message: '', show: false }), ms);
  };

  const handleAdd = (item: any) => {
    setCart((prev) => {
      const newCart = { ...prev, [item.id]: (prev[item.id] || 0) + 1 };
      localStorage.setItem('localCart', JSON.stringify(newCart));
      window.dispatchEvent(new Event('cartUpdated'));
      return newCart;
    });
    showToast('Cart updated');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-white flex items-center justify-center">
        <p className="text-xl font-semibold animate-pulse text-amber-400">Loading menu...</p>
      </div>
    );
  }

  const counts = {
    all: items.length,
    main: items.filter((item) => {
      const cat = (item as any).category;
      return cat && String(cat).toLowerCase().includes('main');
    }).length,
    drinks: items.filter((item) => {
      const cat = (item as any).category;
      return cat && String(cat).toLowerCase().includes('drink');
    }).length,
    dessert: items.filter((item) => {
      const cat = (item as any).category;
      return cat && String(cat).toLowerCase().includes('dessert');
    }).length,
  };

  const categories = [
    { key: 'all', label: 'All' },
    { key: 'main', label: 'Main Dish' },
    { key: 'drinks', label: 'Drinks' },
    { key: 'dessert', label: 'Dessert' },
  ];

  const filteredItems = items.filter((item) => {
    if (selectedCategory === 'all') return true;
    const cat = (item as any).category;
    if (!cat) return false;
    const c = String(cat).toLowerCase();
    return c.includes(selectedCategory.toLowerCase()) || c === selectedCategory.toLowerCase();
  });
  const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const totalPrice = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = items.find(it => it.id === id);
    return sum + (Number(item?.price || 0) * qty);
  }, 0);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white overflow-x-hidden pb-32">
      {/* Navbar is now global in layout.tsx */}

      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-8 flex items-center justify-between gap-3">
          <h1 className="text-4xl font-extrabold text-white">Menu</h1>
        </div>
        
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all focus:outline-none inline-flex items-center gap-2 ` +
                (selectedCategory === cat.key
                  ? 'bg-amber-400 text-black shadow-[0_8px_20px_rgba(245,158,11,0.18)]'
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

        <div className="grid gap-8">
          {filteredItems.map((item) => {
            const qty = cart[item.id] || 0;
            const isAvailable = (item as any).is_available !== false;
            return (
              <div key={item.id} className={`flex gap-4 items-center border-b pb-6 border-white/10 ${!isAvailable ? 'opacity-50' : ''}`}>
                <div className="relative w-24 h-24 flex-shrink-0 rounded-2xl overflow-hidden shadow-sm border border-white/6 bg-white/5">
                  <img
                    src={normalizeImageUrl(String(item.image))}
                    alt={item.name}
                    className={`w-full h-full object-cover ${!isAvailable ? 'grayscale' : ''}`}
                    onError={(e) => { e.currentTarget.src = "https://placehold.co/400x400?text=Food"; }}
                  />
                  {!isAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Unavailable</span>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white leading-tight">{item.name}</h3>
                  <p className="text-white/70 text-sm mt-1 line-clamp-2">{item.description}</p>
                  <div className="flex justify-between items-center mt-3">
                    <p className="text-amber-400 font-bold text-lg">RM {Number(item.price).toFixed(2)}</p>
                    
                    <div className="flex items-center">
                      {isAvailable ? (
                        qty > 0 ? (
                          <div className="flex items-center gap-4 bg-[#1a1f2e] rounded-full p-1 border border-white/10 shadow-lg">
                            <button 
                              onClick={() => handleDecrement(item)}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                            >
                              <Minus size={14} strokeWidth={3} />
                            </button>
                            <span className="text-base font-bold min-w-[12px] text-center text-white">{qty}</span>
                            <button 
                              onClick={() => handleAdd(item)}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-black hover:bg-amber-300 transition-colors"
                            >
                              <Plus size={14} strokeWidth={3} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleAdd(item)}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-black shadow-[0_8px_30px_rgba(245,158,11,0.3)] hover:bg-amber-300 active:scale-90 transition-all"
                          >
                            <Plus size={20} strokeWidth={3} />
                          </button>
                        )
                      ) : (
                        <span className="text-xs font-semibold text-red-400/70">Not available</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom Bar for Mobile */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] animate-slide-up md:hidden">
          <div className="mx-auto max-w-md border-t border-[#d4af37]/30 bg-[#111827]/95 px-6 py-5 backdrop-blur-lg shadow-[0_-10px_40px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <p className="text-[0.65rem] font-black tracking-[0.2em] text-[#d4af37] uppercase opacity-80 decoration-[#d4af37]/30">
                  {cartCount} {cartCount === 1 ? 'Item' : 'Items'} Added
                </p>
                <p 
                  className="mt-1 text-2xl font-bold text-white"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  RM {totalPrice.toFixed(2)}
                </p>
              </div>
              <Link
                href="/view-order"
                className="rounded-full border border-[#d4af37]/80 bg-transparent px-8 py-3.5 text-sm font-black text-[#d4af37] shadow-xl hover:bg-[#d4af37]/10 transition-all tracking-[0.15em] active:scale-95"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                VIEW ORDER
              </Link>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className="fixed top-24 left-1/2 z-50 -translate-x-1/2 transform animate-slide-up">
          <div className="rounded-full bg-[rgba(22,163,74,0.9)] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(22,163,74,0.3)] backdrop-blur-md border border-[#22C55E]">
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MenuPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-white">Loading menu...</div>}>
      <MenuPage />
    </Suspense>
  );
}
