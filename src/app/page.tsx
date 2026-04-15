'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, Suspense } from 'react';
import { ChefHat, Utensils, ShoppingCart, Headset, Crown } from 'lucide-react';
import { MapPin, Phone, Mail } from 'lucide-react';

function LandingPage() {
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [scrollProgress, setScrollProgress] = useState(0);
  const [visibleSections, setVisibleSections] = useState<{ [key: string]: boolean }>({
    hero: false,
    features: false,
    about: false,
    footer: false,
  });
  const tickerItems = [
    'Dine-In - Takeaway - Delivery',
    'Halal Certified',
    'Open 7 Days a Week',
    "Miri's Favourite Restaurant",
    'Western & Traditional Fusion',
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(scrolled);

      // Check which sections are in view
      const sections = document.querySelectorAll('[data-section]');
      const newVisibleSections: { [key: string]: boolean } = { ...visibleSections };

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const sectionId = section.getAttribute('data-section');

        // Trigger animation when section is in view (top < 80% of viewport)
        if (sectionId && rect.top < window.innerHeight * 0.8 && rect.bottom > 0) {
          newVisibleSections[sectionId] = true;
        }
      });

      setVisibleSections(newVisibleSections);
    };

    window.addEventListener('scroll', handleScroll);
    // Initial check
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('localCart');
      if (stored) {
        setCart(JSON.parse(stored));
        // Trigger navbar update just in case
        window.dispatchEvent(new Event('cartUpdated'));
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white overflow-x-hidden selection:bg-amber-400 selection:text-black">
      {/* Navbar is now global in layout.tsx */}
      {/* Scroll Progress Bar */}
      <div
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 z-50 transition-all duration-300"
        style={{ width: `${scrollProgress}%` }}
      />

      <style>{`
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .feature-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 25px rgba(245, 158, 11, 0.15);
        }

        .btn-hover {
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .btn-hover:hover { transform: scale(1.05); }

        .btn-hover::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: rgba(255, 255, 255, 0.1);
          transition: left 0.3s ease;
          z-index: -1;
        }

        .btn-hover:hover::before { left: 100%; }

        .hero-cta {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          padding: 0.88rem 2.35rem;
          font-family: 'Cinzel', 'Cormorant Garamond', 'Baskerville', serif;
          font-size: 1.08rem;
          font-weight: 700;
          letter-spacing: 0.045em;
          line-height: 1;
          transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.28s ease, border-color 0.28s ease, color 0.28s ease, background 0.28s ease;
          will-change: transform;
        }

        .hero-cta::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          opacity: 0;
          transition: opacity 0.28s ease;
          pointer-events: none;
        }

        .hero-cta:hover {
          transform: translateY(-3px) scale(1.01);
        }

        .hero-cta:focus-visible {
          outline: 2px solid rgba(250, 204, 21, 0.75);
          outline-offset: 2px;
        }

        .hero-cta-primary {
          color: #1b1405;
          border: 1px solid rgba(255, 232, 166, 0.85);
          background: linear-gradient(135deg, #ffd44d 0%, #f8be00 52%, #e9a700 100%);
          box-shadow: 0 10px 28px rgba(224, 158, 20, 0.34), inset 0 1px 0 rgba(255, 251, 226, 0.58);
        }

        .hero-cta-primary:hover {
          color: #120e04;
          box-shadow: 0 14px 34px rgba(242, 174, 31, 0.46), inset 0 1px 0 rgba(255, 251, 226, 0.7);
        }

        .hero-cta-primary::after {
          background: linear-gradient(120deg, transparent 18%, rgba(255, 246, 218, 0.5) 50%, transparent 82%);
        }

        .hero-cta-primary:hover::after {
          opacity: 1;
        }

        .hero-cta-secondary {
          color: #f6efe2;
          border: 1px solid rgba(243, 226, 191, 0.26);
          background: linear-gradient(145deg, rgba(35, 44, 67, 0.78), rgba(17, 24, 44, 0.72));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 8px 24px rgba(7, 10, 21, 0.4);
          backdrop-filter: blur(8px);
        }

        .hero-cta-secondary:hover {
          border-color: rgba(249, 220, 163, 0.5);
          color: #fff6e8;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 12px 30px rgba(10, 14, 28, 0.48);
        }

        .hero-cta-secondary::after {
          background: radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.18), transparent 62%);
        }

        .hero-cta-secondary:hover::after {
          opacity: 1;
        }

        .ticker-track {
          width: max-content;
          animation: ticker-scroll 28s linear infinite;
        }

        .ticker-wrap:hover .ticker-track {
          animation-play-state: paused;
        }

        .feature-slice {
          position: relative;
          isolation: isolate;
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .feature-slice::before {
          content: '';
          position: absolute;
          inset: 10px 10px;
          border-radius: 18px;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.015));
          opacity: 0;
          transform: scale(0.98);
          transition: opacity 0.3s ease, transform 0.3s ease;
          z-index: -1;
        }

        .feature-slice:hover {
          transform: translateY(-7px);
        }

        .feature-slice:hover::before {
          opacity: 1;
          transform: scale(1);
        }

        .feature-slice-icon {
          transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .feature-slice:hover .feature-slice-icon {
          color: #fde5ba;
          border-color: rgba(253, 229, 186, 0.75);
          box-shadow: 0 10px 28px rgba(217, 160, 76, 0.22);
          transform: translateY(-2px) scale(1.07);
        }

        .feature-slice-title {
          font-family: 'Cormorant Garamond', 'Baskerville', 'Times New Roman', serif;
          transition: color 0.3s ease, transform 0.3s ease;
        }

        .feature-slice:hover .feature-slice-title {
          color: #fff5e4;
          transform: translateX(2px);
        }

        .feature-slice-copy {
          transition: color 0.3s ease;
        }

        .feature-slice:hover .feature-slice-copy {
          color: #eadfd0;
        }

        .hero-premium-title {
          font-family: 'Cormorant Garamond', 'Baskerville', 'Times New Roman', serif;
          font-weight: 700;
          letter-spacing: -0.015em;
          line-height: 0.98;
          text-shadow: 0 12px 36px rgba(0, 0, 0, 0.38);
        }

        .hero-premium-copy {
          font-family: 'Libre Baskerville', 'Palatino Linotype', 'Book Antiqua', serif;
          font-size: clamp(1.2rem, 1.1vw, 1.42rem);
          line-height: 1.82;
          letter-spacing: 0.004em;
          color: rgba(245, 238, 226, 0.88);
          text-shadow: 0 6px 22px rgba(0, 0, 0, 0.26);
        }

        @media (prefers-reduced-motion: reduce) {
          .ticker-track { animation: none; }
        }
      `}</style>



      {/* Hero - Full Screen */}
      <section
        id="home"
        className="relative overflow-hidden min-h-screen flex items-center"
        data-section="hero"
      >
        <div className="pointer-events-none absolute inset-0">
          <video
            className="absolute inset-0 h-full w-full object-cover opacity-50"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          >
            <source src="/hero-bg.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0f19] via-[#0b0f19]/80 to-transparent" />

          <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="absolute -right-24 top-24 h-80 w-80 rounded-full bg-orange-600/20 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 w-full lg:grid-cols-1 lg:items-center">
          <div
            className={`animate-slide-left lg:-translate-y-6 ${visibleSections.hero ? 'visible' : ''}`}
            style={{ animationDelay: visibleSections.hero ? '0.1s' : '0s' }}
          >
            <h1 className="hero-premium-title mt-6 text-[3.2rem] sm:text-[4.4rem] lg:text-[5.8rem]">
              Enjoy hundreds of
              <br />
              <span className="text-amber-300">flavors under</span>
              <br />
              one roof
            </h1>
            <p className="hero-premium-copy mt-8 max-w-2xl">
              Discover chef-crafted dishes, quick ordering, and a smooth dining
              experience. Browse the menu, place your order, and we'll handle the
              rest.
            </p>

            <div className="mt-5 hidden lg:flex flex-wrap items-center gap-4">
              <Link
                href={`/menu`}
                className="hero-cta hero-cta-primary"
              >
                Browse Menu
              </Link>
              <a
                href="#about"
                className="hero-cta hero-cta-secondary"
              >
                Read More
              </a>
            </div>
          </div>

          {/* Mobile Buttons */}
          <div 
            className={`flex lg:hidden flex-wrap items-center gap-4 animate-slide-right ${visibleSections.hero ? 'visible' : ''}`}
            style={{ animationDelay: visibleSections.hero ? '0.4s' : '0s' }}
          >
            <Link
              href={`/menu`}
              className="hero-cta hero-cta-primary"
            >
              Browse Menu
            </Link>
            <a
              href="#about"
              className="hero-cta hero-cta-secondary"
            >
              Read More
            </a>
          </div>
        </div>
      </section>

      {/* Scrolling Ticker */}
      <section className="bg-[linear-gradient(90deg,rgba(8,13,26,0.97)_0%,rgba(16,24,42,0.96)_48%,rgba(7,12,24,0.97)_100%)] py-4 shadow-[inset_0_1px_0_rgba(214,170,96,0.34),inset_0_-1px_0_rgba(214,170,96,0.34)]">
        <div className="ticker-wrap overflow-hidden whitespace-nowrap">
          <div className="ticker-track flex items-center gap-10 px-8">
            {[...tickerItems, ...tickerItems].map((item, index) => (
              <span
                key={`${item}-${index}`}
                className="inline-flex items-center gap-10 text-[0.72rem] font-semibold uppercase tracking-[0.20em] text-[#d8be8a]"
              >
                <span>{item}</span>
                <Crown size={12} strokeWidth={2.1} className="shrink-0 text-[#eac27a]" aria-hidden="true" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Feature strip - Full Width */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#2c313d_0%,#232935_52%,#1a202b_100%)] py-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-px bg-white/12" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-white/8" />
          <div className="absolute -left-20 top-12 h-56 w-56 rounded-full bg-slate-200/10 blur-3xl" />
          <div className="absolute -right-24 bottom-2 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 gap-0 md:grid-cols-2 lg:grid-cols-4">

            {/* Card 1: Master Chefs */}
            <div className="feature-slice group cursor-pointer px-8 py-10">
              <div className="feature-slice-icon inline-flex h-11 w-11 items-center justify-center rounded-full border border-amber-200/40 text-amber-200/85">
                <ChefHat strokeWidth={2.1} size={20} />
              </div>
              <h3 className="feature-slice-title mt-6 text-[1.95rem] font-medium leading-[1.08] tracking-[0.01em] text-[#f3e8d7]">Master Chefs</h3>
              <p className="feature-slice-copy mt-4 max-w-[16rem] text-[1.08rem] leading-8 text-[#d8ccbb]">
                Crafted by experienced chefs, consistent quality.
              </p>
            </div>

            {/* Card 2: Quality Food */}
            <div className="feature-slice group cursor-pointer border-t border-white/12 px-8 py-10 md:border-l md:border-t-0 lg:border-white/15">
              <div className="feature-slice-icon inline-flex h-11 w-11 items-center justify-center rounded-full border border-amber-200/40 text-amber-200/85">
                <Utensils strokeWidth={2.1} size={20} />
              </div>
              <h3 className="feature-slice-title mt-6 text-[1.95rem] font-medium leading-[1.08] tracking-[0.01em] text-[#f3e8d7]">Quality Food</h3>
              <p className="feature-slice-copy mt-4 max-w-[16rem] text-[1.08rem] leading-8 text-[#d8ccbb]">
                Fresh ingredients with great taste in every bite.
              </p>
            </div>

            {/* Card 3: Online Order */}
            <div className="feature-slice group cursor-pointer border-t border-white/12 px-8 py-10 lg:border-l lg:border-t-0 lg:border-white/15">
              <div className="feature-slice-icon inline-flex h-11 w-11 items-center justify-center rounded-full border border-amber-200/40 text-amber-200/85">
                <ShoppingCart strokeWidth={2.1} size={20} />
              </div>
              <h3 className="feature-slice-title mt-6 text-[1.95rem] font-medium leading-[1.08] tracking-[0.01em] text-[#f3e8d7]">Online Order</h3>
              <p className="feature-slice-copy mt-4 max-w-[16rem] text-[1.08rem] leading-8 text-[#d8ccbb]">
                Order from the table and track your order easily.
              </p>
            </div>

            {/* Card 4: 24/7 Service */}
            <div className="feature-slice group cursor-pointer border-t border-white/12 px-8 py-10 md:border-l lg:border-t-0 lg:border-white/15">
              <div className="feature-slice-icon inline-flex h-11 w-11 items-center justify-center rounded-full border border-amber-200/40 text-amber-200/85">
                <Headset strokeWidth={2.1} size={20} />
              </div>
              <h3 className="feature-slice-title mt-6 text-[1.95rem] font-medium leading-[1.08] tracking-[0.01em] text-[#f3e8d7]">24/7 Service</h3>
              <p className="feature-slice-copy mt-4 max-w-[16rem] text-[1.08rem] leading-8 text-[#d8ccbb]">
                Support for your dining flow whenever needed.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* About - Full Height */}
      <section
        id="about"
        className="bg-[#0b0f19] py-20"
        data-section="about"
      >
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 lg:grid-cols-2 lg:items-center">
          <div className="grid grid-cols-2 gap-5">
            <div
              className={`overflow-hidden rounded-2xl border border-white/10 bg-white/5 animate-scale glow-animation antigravity ${visibleSections.about ? 'visible' : ''}`}
              style={{ animationDelay: visibleSections.about ? '0.1s' : '0s' }}
            >
              <div className="aspect-[4/3] w-full bg-[url('https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center transition-transform duration-500 hover:scale-110" />
            </div>
            <div
              className={`overflow-hidden rounded-2xl border border-white/10 bg-white/5 animate-scale glow-animation antigravity-slow ${visibleSections.about ? 'visible' : ''}`}
              style={{ animationDelay: visibleSections.about ? '0.2s' : '0s' }}
            >
              <div className="aspect-[4/3] w-full bg-[url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center transition-transform duration-500 hover:scale-110" />
            </div>
            <div
              className={`col-span-2 overflow-hidden rounded-2xl border border-white/10 bg-white/5 animate-scale glow-animation antigravity-fast ${visibleSections.about ? 'visible' : ''}`}
              style={{ animationDelay: visibleSections.about ? '0.3s' : '0s' }}
            >
              <div className="aspect-[16/7] w-full bg-[url('https://images.unsplash.com/photo-1572715376701-98568319fd0b?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')] bg-cover bg-center transition-transform duration-500 hover:scale-110" />
            </div>
          </div>

          <div
            className={`animate-slide-left ${visibleSections.about ? 'visible' : ''}`}
            style={{ animationDelay: visibleSections.about ? '0.2s' : '0s' }}
          >
            <p className="text-base font-semibold text-amber-300">About Us</p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Welcome to <span className="text-amber-300">MakanSedap</span>
            </h2>
            <p className="mt-6 text-base leading-8 text-white/70">
              We take pride in our culinary diversity, bringing Western and traditional cuisines together on a single menu. Whether you're craving the bold,
              rustic spices of a local heritage dish or the refined, savory pull of a Western classic, our kitchen strikes the perfect balance between the familiar and the global.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-6">
              <div
                className={`rounded-2xl border border-white/10 bg-white/5 p-6 animate-rotate feature-card antigravity-fast ${visibleSections.about ? 'visible' : ''}`}
                style={{ animationDelay: visibleSections.about ? '0.3s' : '0s' }}
              >
                <p className="text-4xl font-extrabold text-amber-300">10</p>
                <p className="mt-2 text-base font-semibold">Years Experience</p>
              </div>
              <div
                className={`rounded-2xl border border-white/10 bg-white/5 p-6 animate-rotate feature-card antigravity-slow ${visibleSections.about ? 'visible' : ''}`}
                style={{ animationDelay: visibleSections.about ? '0.4s' : '0s' }}
              >
                <p className="text-4xl font-extrabold text-amber-300">15</p>
                <p className="mt-2 text-base font-semibold">Master Chefs</p>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href="#contact"
                className="btn-hover rounded-full bg-amber-400 px-8 py-3 text-base font-extrabold text-black hover:bg-amber-300"
              >
                Contact Us
              </a>
              <Link
                href={`/menu`}
                className="btn-hover rounded-full border border-white/15 bg-white/5 px-8 py-3 text-base font-semibold text-white hover:bg-white/10"
              >
                Order Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section
        id="contact"
        className="bg-[#0b0f19] border-t border-white/10"
        data-section="footer"
      >
        <div className="mx-auto max-w-7xl px-4 py-20">
          <div className="mb-16">
            <p className="text-sm font-semibold text-amber-300 tracking-wide">GET IN TOUCH</p>
            <h2 className="mt-3 text-5xl lg:text-6xl font-extrabold tracking-tight">
              Contact Us
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Left Side - Contact Info */}
            <div
              className={`animate-slide-left ${visibleSections.footer ? 'visible' : ''}`}
              style={{ animationDelay: visibleSections.footer ? '0.1s' : '0s' }}
            >
              <p className="text-base leading-8 text-white/70 max-w-md">
                MakanSedap offers an exceptional dining experience with chef-crafted dishes and quick ordering. Each meal is thoughtfully prepared using the finest ingredients and traditional techniques, creating a comfortable retreat to enjoy delicious food at the end of your day.
              </p>

              {/* Address */}
              <div className="mt-10 flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-400 text-black">
                    <MapPin size={18} strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/80 tracking-wide">ADDRESS</p>
                  <p className="mt-2 text-base text-white/70">
                    LOT 683, BLOCK 9, JALAN PUJUT-LUTONG,<br />
                    C.D.T. 20, 98009 MIRI, SARAWAK.<br />
                    MALAYSIA.
                  </p>
                </div>
              </div>

              {/* Phone */}
              <div className="mt-8 flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-400 text-black">
                    <Phone size={18} strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/80 tracking-wide">PHONE</p>
                  <p className="mt-2 text-base text-white/70">
                    +60 12-345 6789
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="mt-8 flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-400 text-black">
                    <Mail size={18} strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/80 tracking-wide">EMAIL</p>
                  <p className="mt-2 text-base text-white/70">
                    hello@makansedap.com
                  </p>
                </div>
              </div>
            </div>

            {/* Right Side - Contact Form */}
            <div
              className={`animate-slide-right ${visibleSections.footer ? 'visible' : ''}`}
              style={{ animationDelay: visibleSections.footer ? '0.2s' : '0s' }}
            >
              <form className="space-y-5">
                <div>
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="w-full px-6 py-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400 focus:bg-white/10 transition-all duration-300"
                  />
                </div>

                <div>
                  <input
                    type="email"
                    placeholder="Email Address"
                    className="w-full px-6 py-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400 focus:bg-white/10 transition-all duration-300"
                  />
                </div>

                <div>
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    className="w-full px-6 py-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400 focus:bg-white/10 transition-all duration-300"
                  />
                </div>

                <div>
                  <textarea
                    placeholder="Message"
                    rows={6}
                    className="w-full px-6 py-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400 focus:bg-white/10 transition-all duration-300 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full btn-hover bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-extrabold py-4 rounded-lg text-base tracking-wider"
                >
                  SUBMIT
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0a0d16]">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
            {/* Company Info */}
            <div
              className={`animate-on-scroll ${visibleSections.footer ? 'visible' : ''}`}
              style={{ animationDelay: visibleSections.footer ? '0s' : '0s' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="https://images.unsplash.com/photo-1644920437956-388353e26e28?q=80&w=627&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                  alt="MakanSedap Logo"
                  className="h-10 w-10 rounded-xl object-cover"
                />
                <p className="text-lg font-bold text-amber-300">MakanSedap</p>
              </div>
              <p className="text-base leading-7 text-white/70">
                A modern dining experience with fast ordering and great food.
              </p>
            </div>

            {/* Contact Info */}
            <div
              className={`animate-on-scroll ${visibleSections.footer ? 'visible' : ''}`}
              style={{ animationDelay: visibleSections.footer ? '0.1s' : '0s' }}
            >
              <p className="text-base font-bold text-white mb-4">Contact</p>
              <ul className="space-y-3 text-base text-white/70">
                <li className="flex items-center gap-2">
                  <MapPin size={18} className="text-amber-400 shrink-0 mt-1" strokeWidth={2.5} />
                  <span>LOT 683, BLOCK 9, JALAN PUJUT-LUTONG, C.D.T. 20, 98009 MIRI, SARAWAK</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone size={18} className="text-amber-400 shrink-0" strokeWidth={2.5} />
                  <span>+60 12-345 6789</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={18} className="text-amber-400 shrink-0" strokeWidth={2.5} />
                  <span>hello@makansedap.com</span>
                </li>
              </ul>
            </div>

            {/* Opening Hours */}
            <div
              className={`animate-on-scroll ${visibleSections.footer ? 'visible' : ''}`}
              style={{ animationDelay: visibleSections.footer ? '0.2s' : '0s' }}
            >
              <p className="text-base font-bold text-white mb-4">Opening Hours</p>
              <ul className="space-y-3 text-base text-white/70">
                <li>Mon – Fri: 9AM – 11PM</li>
                <li>Sat – Sun: 10AM – 12AM</li>
                <li className="pt-2 border-t border-white/10 mt-4">
                  <span className="text-amber-300">Delivery Available</span>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div
              className={`animate-on-scroll ${visibleSections.footer ? 'visible' : ''}`}
              style={{ animationDelay: visibleSections.footer ? '0.3s' : '0s' }}
            >
              <p className="text-base font-bold text-white mb-4">Newsletter</p>
              <p className="text-base text-white/70 mb-4">
                Get updates about new dishes and exclusive promos.
              </p>
              <div className="flex overflow-hidden rounded-lg border border-white/10 bg-white/5">
                <input
                  type="email"
                  placeholder="Your email"
                  className="w-full bg-transparent px-4 py-3 text-base text-white placeholder:text-white/40 focus:outline-none transition-all"
                />
                <button className="btn-hover bg-amber-400 px-4 py-3 text-base font-extrabold text-black hover:bg-amber-300 whitespace-nowrap">
                  Join
                </button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="my-8 border-t border-white/10" />

          {/* Bottom Footer */}
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-white/50 md:flex-row">
            <p>© {new Date().getFullYear()} MakanSedap. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white/80 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white/80 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-white">Loading...</div>}>
      <LandingPage />
    </Suspense>
  );
}
