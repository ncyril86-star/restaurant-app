'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown, ChevronRight, ShoppingCart } from 'lucide-react';

interface NavbarProps {
  cart?: { [key: string]: number };
}

export default function Navbar({ cart: initialCart }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const pathname = usePathname();
  const isMenuPage = pathname?.startsWith('/menu');

  // Sync cart count from localStorage or props
  useEffect(() => {
    const updateCartCount = () => {
      const stored = localStorage.getItem('localCart');
      if (stored) {
        const cartData = JSON.parse(stored);
        const count = Object.values(cartData).reduce((sum, qty) => (sum as number) + (qty as number), 0);
        setCartCount(count as number);
      } else {
        setCartCount(0);
      }
    };

    updateCartCount();

    // Listen for storage changes (cross-tab)
    window.addEventListener('storage', updateCartCount);
    // Listen for custom cart update event (same-tab)
    window.addEventListener('cartUpdated', updateCartCount);

    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cartUpdated', updateCartCount);
    };
  }, []);

  // Also update if props change (for backward compatibility if still used in some pages)
  useEffect(() => {
    if (initialCart) {
      const count = Object.values(initialCart).reduce((sum, qty) => (sum as number) + (qty as number), 0);
      setCartCount(count as number);
    }
  }, [initialCart]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  const navLinks = [
    { name: 'Home', href: '/#home' },
    { name: 'About', href: '/#about' },
    { name: 'Menu', href: '/menu', hasDropdown: true },
    { name: 'Contact', href: '/#contact' },
    { name: 'Reviews', href: '/reviews' },
  ];

  return (
    <>
      <header 
        className={`sticky top-0 z-50 border-b border-white/10 transition-all duration-300 ${
          isScrolled ? 'bg-[#18181F] py-2' : 'bg-[#18181F] py-3'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative overflow-hidden rounded-xl h-9 w-9">
              <img
                src="https://images.unsplash.com/photo-1644920437956-388353e26e28?q=80&w=627&auto=format&fit=crop"
                alt="MakanSedap Logo"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-amber-400/10 group-hover:bg-transparent transition-colors" />
            </div>
            <div className="leading-tight">
              <p
                className="text-[clamp(1.2rem,1.55vw,1.75rem)] font-semibold leading-none tracking-[0.01em]"
                style={{ fontFamily: "'Cormorant Garamond', 'Baskerville', 'Times New Roman', serif" }}
              >
                <span className="text-[#efe3d2] transition-colors group-hover:text-[#fff1de]">Makan</span>
                <span className="text-[#d4af37] transition-colors group-hover:text-[#e9c56a]">Sedap</span>
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav
            className="hidden items-center gap-8 text-[clamp(1rem,1.25vw,1.4rem)] font-semibold leading-none text-white/75 md:flex"
            style={{ fontFamily: "'Cormorant Garamond', 'Baskerville', 'Times New Roman', serif" }}
          >
            {navLinks.map((link) => (
              <div key={link.name} className="relative group py-2">
                {link.hasDropdown ? (
                  <div className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                    <Link href={link.href}>{link.name}</Link>
                    <ChevronDown size={20} className="transition-transform duration-300 group-hover:rotate-180" />
                    
                    {/* Dropdown Content */}
                    <div className="absolute left-0 top-full mt-1 w-48 rounded-xl border border-white/10 bg-[#0b0f19]/95 backdrop-blur-md shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top scale-95 group-hover:scale-100">
                      <div className="py-2 flex flex-col">
                        <Link href="/menu?category=main" className="px-4 py-2 hover:bg-white/10 hover:text-amber-300 transition-colors">Main Dish</Link>
                        <Link href="/menu?category=dessert" className="px-4 py-2 hover:bg-white/10 hover:text-amber-300 transition-colors">Desserts</Link>
                        <Link href="/menu?category=drinks" className="px-4 py-2 hover:bg-white/10 hover:text-amber-300 transition-colors">Drinks</Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link href={link.href} className="hover:text-white transition-colors">
                    {link.name}
                  </Link>
                )}
              </div>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <Link
              href="/view-order"
              className="hidden sm:flex rounded-full border border-[#d4af37]/80 bg-transparent px-5 py-2.5 text-[clamp(0.9rem,1vw,1.15rem)] font-semibold leading-none text-[#d4af37] shadow-[0_8px_20px_rgba(212,175,55,0.18)] hover:bg-[#d4af37]/10 hover:scale-105 active:scale-95 transition-all items-center gap-2"
              style={{ fontFamily: "'Cormorant Garamond', 'Baskerville', 'Times New Roman', serif" }}
            >
              VIEW ORDER
              {cartCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#d4af37]/15 px-1 text-[10px] font-bold border border-[#d4af37]/40">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center justify-center p-2 rounded-xl bg-white/5 border border-white/10 text-white md:hidden hover:bg-white/10 transition-colors"
              aria-label="Toggle Menu"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay (Backdrop + Drawer) */}
      <div 
        className={`fixed inset-0 z-[100] transition-all duration-500 md:hidden ${
          isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
        />
        
        {/* Drawer */}
        <div 
          className={`absolute right-0 top-0 h-full w-[85%] max-w-[420px] bg-[#1F2937] text-[#F9FAFB] shadow-[0_0_50px_rgba(0,0,0,0.3)] border-l border-[#374151] transition-transform duration-500 ease-out transform ${
            isMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ opacity: 1 }}
        >
          <div className="flex flex-col h-full pt-6">
            {/* Close Button Inside Drawer */}
            <div className="flex justify-end px-6 mb-4">
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Close Menu"
              >
                <X size={24} className="text-[#F9FAFB]" />
              </button>
            </div>

            <nav className="flex flex-col px-6 space-y-1">
              {navLinks.map((link, idx) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`group flex items-center justify-between py-4 text-xl font-bold transition-all duration-300 transform border-b border-[#374151] ${
                    isMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'
                  }`}
                  style={{ transitionDelay: `${idx * 50}ms` }}
                >
                  <span className="text-[#F9FAFB] group-hover:translate-x-1 transition-transform">{link.name}</span>
                  <ChevronRight size={20} className="text-[#F9FAFB]/30 group-hover:text-[#F9FAFB] transition-colors" />
                </Link>
              ))}
            </nav>

            {!isMenuPage && (
              <div className={`mt-auto p-6 pb-12 transition-all duration-500 transform ${
                isMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
              }`} style={{ transitionDelay: '300ms' }}>
                <Link
                  href="/view-order"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex w-full items-center justify-center gap-3 rounded-full bg-amber-400 py-4 text-sm font-black text-black shadow-xl hover:bg-amber-300 transition-colors"
                >
                  <ShoppingCart size={18} />
                  VIEW ORDER ({cartCount})
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
