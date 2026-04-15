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

        .ticker-track {
          width: max-content;
          animation: ticker-scroll 28s linear infinite;
        }

        .ticker-wrap:hover .ticker-track {
          animation-play-state: paused;
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
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0f19] via-[#0b0f19]/80 to-transparent" />

          <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="absolute -right-24 top-24 h-80 w-80 rounded-full bg-orange-600/20 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 w-full lg:grid-cols-2 lg:items-center">
          <div
            className={`animate-slide-left ${visibleSections.hero ? 'visible' : ''}`}
            style={{ animationDelay: visibleSections.hero ? '0.1s' : '0s' }}
          >
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
              Enjoy hundreds of flavors under one roof
            </p>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Enjoy hundreds of
              <br />
              <span className="text-amber-300">flavors under</span>
              <br />
              one roof
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-white/70">
              Discover chef-crafted dishes, quick ordering, and a smooth dining
              experience. Browse the menu, place your order, and we'll handle the
              rest.
            </p>

            <div className="mt-5 hidden lg:flex flex-wrap items-center gap-4">
              <Link
                href={`/menu`}
                className="btn-hover rounded-full bg-amber-400 px-8 py-3 text-base font-extrabold text-black hover:bg-amber-300"
              >
                Browse Menu
              </Link>
              <a
                href="#about"
                className="btn-hover rounded-full border border-white/15 bg-white/5 px-8 py-3 text-base font-semibold text-white hover:bg-white/10"
              >
                Read More
              </a>
            </div>
          </div>

          <div
            className={`animate-slide-right antigravity ${visibleSections.hero ? 'visible' : ''}`}
            style={{ animationDelay: visibleSections.hero ? '0.3s' : '0s' }}
          >
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/70 backdrop-blur-xl">
              <div className="grid grid-cols-5">
                <div className="col-span-2 p-6">
                  <p className="text-xs font-semibold text-white/70">Today's pick</p>
                  <p className="mt-3 text-lg font-bold">Signature Sets</p>
                  <p className="mt-2 text-sm text-white/70">
                    Popular combos, ready in minutes.
                  </p>
                  <div className="mt-6 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm border border-white/10">
                    Fresh • Hot • Fast
                  </div>
                </div>
                <div className="col-span-3">
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <video
                      className="h-full w-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      poster="https://images.unsplash.com/photo-1633271333045-d6cd23567743?q=80&w=687&auto=format&fit=crop"
                    >
                      <source
                        src="https://cdn.coverr.co/videos/coverr-cooking-pasta-1579/1080p.mp4"
                        type="video/mp4"
                      />
                      <source
                        src="https://videos.pexels.com/video-files/3769033/3769033-sd_640_360_25fps.mp4"
                        type="video/mp4"
                      />
                    </video>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/20 via-transparent to-orange-500/20" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Buttons */}
          <div 
            className={`flex lg:hidden flex-wrap items-center gap-4 animate-slide-right ${visibleSections.hero ? 'visible' : ''}`}
            style={{ animationDelay: visibleSections.hero ? '0.4s' : '0s' }}
          >
            <Link
              href={`/menu`}
              className="btn-hover rounded-full bg-amber-400 px-8 py-3 text-base font-extrabold text-black hover:bg-amber-300"
            >
              Browse Menu
            </Link>
            <a
              href="#about"
              className="btn-hover rounded-full border border-white/15 bg-white/5 px-8 py-3 text-base font-semibold text-white hover:bg-white/10"
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
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,rgba(7,14,33,0.95)_0%,rgba(10,18,40,0.98)_48%,rgba(6,12,28,0.96)_100%)] py-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-px bg-amber-300/20" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-amber-300/15" />
          <div className="absolute -left-20 top-12 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute -right-24 bottom-2 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">

          {/* Card 1: Master Chefs */}
          <div className="group rounded-3xl border border-white/5 bg-[#16130d]/80 p-8 backdrop-blur-md transition-all hover:-translate-y-2 hover:border-amber-400/20 hover:bg-[#1f1b13]">
            {/* Applied 'antigravity' to the container */}
            <div className="antigravity flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-black shadow-lg shadow-amber-400/20 transition-transform duration-300 group-hover:scale-110">
              <ChefHat strokeWidth={2.5} size={28} />
            </div>
            <h3 className="mt-6 text-xl font-bold tracking-tight text-white">Master Chefs</h3>
            <p className="mt-3 text-sm font-medium leading-relaxed tracking-wide text-white/70">
              Crafted by experienced chefs, consistent quality.
            </p>
          </div>

          {/* Card 2: Quality Food */}
          <div className="group rounded-3xl border border-white/5 bg-[#16130d]/80 p-8 backdrop-blur-md transition-all hover:-translate-y-2 hover:border-amber-400/20 hover:bg-[#1f1b13]">
            {/* Applied the SAME 'antigravity' class for sync */}
            <div className="antigravity flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-black shadow-lg shadow-amber-400/20 transition-transform duration-300 group-hover:scale-110">
              <Utensils strokeWidth={2.5} size={28} />
            </div>
            <h3 className="mt-6 text-xl font-bold tracking-tight text-white">Quality Food</h3>
            <p className="mt-3 text-sm font-medium leading-relaxed tracking-wide text-white/70">
              Fresh ingredients with great taste in every bite.
            </p>
          </div>

          {/* Card 3: Online Order */}
          <div className="group rounded-3xl border border-white/5 bg-[#16130d]/80 p-8 backdrop-blur-md transition-all hover:-translate-y-2 hover:border-amber-400/20 hover:bg-[#1f1b13]">
            {/* Applied the SAME 'antigravity' class for sync */}
            <div className="antigravity flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-black shadow-lg shadow-amber-400/20 transition-transform duration-300 group-hover:scale-110">
              <ShoppingCart strokeWidth={2.5} size={28} />
            </div>
            <h3 className="mt-6 text-xl font-bold tracking-tight text-white">Online Order</h3>
            <p className="mt-3 text-sm font-medium leading-relaxed tracking-wide text-white/70">
              Order from the table and track your order easily.
            </p>
          </div>

          {/* Card 4: 24/7 Service */}
          <div className="group rounded-3xl border border-white/5 bg-[#16130d]/80 p-8 backdrop-blur-md transition-all hover:-translate-y-2 hover:border-amber-400/20 hover:bg-[#1f1b13]">
            {/* Applied the SAME 'antigravity' class for sync */}
            <div className="antigravity flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-black shadow-lg shadow-amber-400/20 transition-transform duration-300 group-hover:scale-110">
              <Headset strokeWidth={2.5} size={28} />
            </div>
            <h3 className="mt-6 text-xl font-bold tracking-tight text-white">24/7 Service</h3>
            <p className="mt-3 text-sm font-medium leading-relaxed tracking-wide text-white/70">
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
