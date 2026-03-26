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
  const [currentOrderId, setCurrentOrderId] = useState(searchParams.get('orderId') || '');
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
    const loadOrderToCart = async () => {
      try {
        const urlId = searchParams.get('orderId');
        // If urlId is explicitly '', it means user wants a fresh start (e.g., from "Order Again")
        // If urlId is null, it means the param is missing, so we check localStorage
        const stored = urlId === '' ? '' : (urlId || (typeof window !== 'undefined' ? localStorage.getItem('currentOrderId') : '') || '');
        
        if (!stored) {
          setCart({});
          setCurrentOrderId('');
          if (typeof window !== 'undefined') localStorage.removeItem('currentOrderId');
          return;
        }
        
        setCurrentOrderId(stored);
        
        const ref = doc(db, 'orders', stored);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          if (typeof window !== 'undefined') localStorage.removeItem('currentOrderId');
          return;
        }
        const data = snap.data() as any;
        
        // If the order is already paid, DO NOT load it into the cart! 
        // Force the user to start a new order.
        if (data.status === 'paid') {
          setCurrentOrderId('');
          setCart({});
          if (typeof window !== 'undefined') localStorage.removeItem('currentOrderId');
          return;
        }

        if (Array.isArray(data.items)) {
          const cartMap: { [k: string]: number } = {};
          data.items.forEach((it: any) => {
            if (it && it.id) cartMap[it.id] = it.qty || it.quantity || 0;
          });
          setCart(cartMap);
          try { localStorage.setItem('currentOrderId', stored); } catch {}
        }
      } catch (err) {
        console.warn('Failed to load order to cart:', err);
      }
    };
    loadOrderToCart();
  }, [searchParams]);

  const handleDecrement = async (item: any) => {
    setCart((prev) => {
      const current = prev[item.id] || 0;
      const next = Math.max(0, current - 1);
      return { ...prev, [item.id]: next };
    });

    try {
      const usedOrderId = currentOrderId || (typeof window !== 'undefined' ? localStorage.getItem('currentOrderId') || '' : '');
      if (!usedOrderId) return;
      
      const ref = doc(db, 'orders', usedOrderId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const data = snap.data() as any;
      const existingItems = Array.isArray(data.items) ? data.items : [];
      const idx = existingItems.findIndex((it: any) => it.id === item.id);
      
      if (idx >= 0) {
        existingItems[idx].qty = Math.max(0, (existingItems[idx].qty || 0) - 1);
        if (existingItems[idx].qty === 0) {
          existingItems.splice(idx, 1);
        }
        await updateDoc(ref, { items: existingItems, updatedAt: serverTimestamp() });
      }
    } catch (err) {
      console.warn('Failed to decrement in order:', err);
    }
  };

  const showToast = (message: string, ms = 1800) => {
    setToast({ message, show: true });
    setTimeout(() => setToast({ message: '', show: false }), ms);
  };

  const handleAdd = async (item: any) => {
    setCart((prev) => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));

    try {
      let usedOrderId = currentOrderId;

      if (!usedOrderId) {
        const newOrder = {
          items: [
            {
              id: item.id,
              name: item.name,
              price: item.price,
              qty: 1,
              image: item.image || null,
              description: item.description || null,
              category: item.category || null, // <-- Category added here
            },
          ],
          status: 'pending',
          createdAt: serverTimestamp(),
        } as any;

        const colRef = collection(db, 'orders');
        const docRef = await addDoc(colRef, newOrder);
        usedOrderId = docRef.id;
        setCurrentOrderId(usedOrderId);
      } else {
        const ref = doc(db, 'orders', usedOrderId);
        const snap = await getDoc(ref);
        
        if (!snap.exists()) {
          const colRef = collection(db, 'orders');
          const docRef = await addDoc(colRef, {
            items: [
              { id: item.id, name: item.name, price: item.price, qty: 1, image: item.image || null, description: item.description || null, category: item.category || null } // <-- Category added here
            ],
            status: 'pending',
            createdAt: serverTimestamp(),
          });
          usedOrderId = docRef.id;
          setCurrentOrderId(usedOrderId);
        } else {
          const data = snap.data() as any;
          const existingItems = Array.isArray(data.items) ? data.items : [];
          const foundIdx = existingItems.findIndex((it: any) => it.id === item.id);
          if (foundIdx >= 0) {
            existingItems[foundIdx].qty = (existingItems[foundIdx].qty || 0) + 1;
          } else {
            existingItems.push({ id: item.id, name: item.name, price: item.price, qty: 1, image: item.image || null, description: item.description || null, category: item.category || null }); // <-- Category added here
          }
          await updateDoc(ref, { items: existingItems, updatedAt: serverTimestamp() });
        }
      }

      showToast('Order updated');
      try { if (typeof window !== 'undefined') localStorage.setItem('currentOrderId', usedOrderId); } catch {}
    } catch (error) {
      console.error('Error adding to order:', error);
      showToast('Failed to add to order');
    }
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

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0f19]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1644920437956-388353e26e28?q=80&w=627&auto=format&fit=crop"
              alt="MakanSedap Logo"
              className="h-9 w-9 rounded-xl object-cover"
            />
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-wide text-amber-300">MakanSedap</p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-white/80 md:flex">
            <a className="hover:text-white" href="/#home">Home</a>
            <a className="hover:text-white" href="/#about">About</a>
            <Link href={`/menu?orderId=${currentOrderId}`} className="hover:text-white">Menu</Link>
            <a className="hover:text-white" href="/#contact">Contact</a>
            <Link className="hover:text-white transition-colors" href="/reviews">Reviews</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={`/view-order?orderId=${currentOrderId}`}
              className="rounded-full bg-amber-400 px-4 py-2 text-sm font-extrabold text-black shadow-[0_10px_30px_rgba(245,158,11,0.25)] hover:bg-amber-300"
            >
              View Order
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-6">
        <h1 className="text-4xl font-extrabold text-white mb-8">Menu</h1>
        
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
      {toast.show && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform">
          <div className="rounded-full bg-white/6 px-5 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur-md border border-white/10">
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