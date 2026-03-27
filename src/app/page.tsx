'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, Suspense } from 'react';
import { ChefHat, Utensils, ShoppingCart, Headset } from 'lucide-react';
import { MapPin, Phone, Mail } from 'lucide-react';

function LandingPage() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [visibleSections, setVisibleSections] = useState<{ [key: string]: boolean }>({
    hero: false,
    features: false,
    about: false,
    footer: false,
  });

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

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white overflow-x-hidden">
      {/* Scroll Progress Bar */}
      <div
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 z-50 transition-all duration-300"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Scroll-Driven Animations Styles */}
      <style>{`
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-50px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes rotateIn {
          from { opacity: 0; transform: rotate(-5deg) scale(0.95); }
          to { opacity: 1; transform: rotate(0deg) scale(1); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes antigravity {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes antigravity-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-25px); }
        }

        @keyframes antigravity-fast {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }

        .antigravity { animation: antigravity 2s ease-in-out infinite; }
        .antigravity-slow { animation: antigravity-slow 5s ease-in-out infinite; }
        .antigravity-fast { animation: antigravity-fast 3s ease-in-out infinite; }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.3); }
          50% { box-shadow: 0 0 30px rgba(245, 158, 11, 0.6); }
        }

        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }

        .animate-on-scroll.visible { animation: fadeInUp 0.8s ease-out forwards; }
        .animate-slide-left.visible { animation: slideInLeft 0.8s ease-out forwards; }
        .animate-slide-right.visible { animation: slideInRight 0.8s ease-out forwards; }
        .animate-scale.visible { animation: scaleIn 0.8s ease-out forwards; }
        .animate-rotate.visible { animation: rotateIn 0.8s ease-out forwards; }

        .float-animation { animation: float 3s ease-in-out infinite; }
        .glow-animation { animation: glow 2s ease-in-out infinite; }

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
      `}</style>

      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0f19]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
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
          </div>

          <nav className="hidden items-center gap-6 text-sm text-white/80 md:flex">
            <a className="hover:text-white transition-colors" href="#home">Home</a>
            <a className="hover:text-white transition-colors" href="#about">About</a>

            {/* Dropdown Menu Container */}
            <div className="relative group py-2">
              <Link
                href="/menu"
                className="hover:text-white flex items-center gap-1 transition-colors"
              >
                Menu
                {/* Chevron Icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>

              {/* Dropdown Content */}
              <div className="absolute left-0 top-full mt-1 w-48 rounded-xl border border-white/10 bg-[#0b0f19]/95 backdrop-blur-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top scale-95 group-hover:scale-100">
                <div className="py-2 flex flex-col">
                  <Link
                    href={`/menu?category=main`}
                    className="px-4 py-2 text-white/70 hover:bg-white/10 hover:text-amber-300 transition-colors"
                  >
                    Main Dish
                  </Link>
                  <Link
                    href={`/menu?category=dessert`}
                    className="px-4 py-2 text-white/70 hover:bg-white/10 hover:text-amber-300 transition-colors"
                  >
                    Desserts
                  </Link>
                  <Link
                    href={`/menu?category=drinks`}
                    className="px-4 py-2 text-white/70 hover:bg-white/10 hover:text-amber-300 transition-colors"
                  >
                    Drinks
                  </Link>
                </div>
              </div>
            </div>

            <a className="hover:text-white transition-colors" href="#contact">Contact</a>

            <Link className="hover:text-white transition-colors" href="/reviews">Reviews</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={`/view-order`}
              className="rounded-full bg-amber-400 px-4 py-2 text-sm font-extrabold text-black shadow-[0_10px_30px_rgba(245,158,11,0.25)] hover:bg-amber-300 transition-colors"
            >
              View Order
            </Link>
          </div>
        </div>
      </header>

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
              Enjoy Hundreds Of Flavors Under One Roof
            </p>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Enjoy Hundreds Of
              <br />
              Flavors Under One
              <br />
              Roof
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-white/70">
              Discover chef-crafted dishes, quick ordering, and a smooth dining
              experience. Browse the menu, place your order, and we'll handle the
              rest.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
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
                  <div className="aspect-[4/3] w-full bg-[linear-gradient(120deg,rgba(245,158,11,0.25),rgba(249,115,22,0.15)),url('https://images.unsplash.com/photo-1633271333045-d6cd23567743?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')] bg-cover bg-center" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature strip - Full Width */}
      <section className="mx-auto max-w-7xl px-4 py-16">
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