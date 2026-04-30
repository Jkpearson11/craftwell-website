"use client";

import { useState, useEffect } from "react";

const navLinks = [
  { label: "Services", href: "#services" },
  { label: "About", href: "#about" },
  { label: "Portfolio", href: "#portfolio" },
  { label: "Reviews", href: "#reviews" },
  { label: "Contact", href: "#contact" },
];

function CraftwellLogo() {
  return (
    <svg viewBox="0 0 280 72" className="h-10 w-auto flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="274" height="66" fill="none" stroke="#DCD7C9" strokeWidth="1.2" />
      <circle cx="8"   cy="8"  r="2.5" fill="#DCD7C9" />
      <circle cx="272" cy="8"  r="2.5" fill="#DCD7C9" />
      <circle cx="8"   cy="64" r="2.5" fill="#DCD7C9" />
      <circle cx="272" cy="64" r="2.5" fill="#DCD7C9" />
      <text x="140" y="40" textAnchor="middle"
        fontFamily="Georgia,'Times New Roman',serif"
        fontWeight="700" fontSize="26" letterSpacing="3" fill="#DCD7C9">
        CRAFTWELL
      </text>
      <text x="140" y="57" textAnchor="middle"
        fontFamily="Georgia,'Times New Roman',serif"
        fontWeight="400" fontSize="9" letterSpacing="5" fill="#DCD7C9" opacity="0.8">
        CONSTRUCTION SERVICES
      </text>
    </svg>
  );
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-navy-500/96 backdrop-blur-sm shadow-lg" : "bg-navy-900/60 backdrop-blur-sm"
    }`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">

        {/* Single row: Logo | Nav links (center) | Phone (right) */}
        <div className="flex items-center justify-between h-20 gap-6">

          {/* Logo — left */}
          <a href="#" aria-label="Craftwell Construction Services" className="flex-shrink-0">
            <CraftwellLogo />
          </a>

          {/* Nav links — center, desktop only */}
          <nav className="hidden lg:flex items-center gap-7 flex-1 justify-center">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href}
                className="text-xs tracking-widest uppercase text-cream-300 hover:text-tan-300 transition-colors duration-200 whitespace-nowrap">
                {link.label}
              </a>
            ))}
          </nav>

          {/* Phone + CTA — right, desktop only */}
          <div className="hidden lg:flex items-center gap-5 flex-shrink-0">
            <a href="tel:+18178990624"
              className="text-white font-semibold text-xl tracking-wide hover:text-tan-300 transition-colors duration-200 whitespace-nowrap">
              (817) 899-0624
            </a>
            <a href="#contact"
              className="px-5 py-2.5 border border-tan-400 text-tan-300 text-xs tracking-widest uppercase hover:bg-tan-500 hover:text-white hover:border-tan-500 transition-all duration-200 whitespace-nowrap">
              Free Quote
            </a>
          </div>

          {/* Mobile: phone number + hamburger */}
          <div className="lg:hidden flex items-center gap-4">
            <a href="tel:+18178990624"
              className="text-white font-semibold text-base hover:text-tan-300 transition-colors">
              (817) 899-0624
            </a>
            <button className="flex flex-col gap-1.5 p-2"
              onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
              <span className={`block w-6 h-px bg-cream-300 transition-all duration-200 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`block w-6 h-px bg-cream-300 transition-all duration-200 ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block w-6 h-px bg-cream-300 transition-all duration-200 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="lg:hidden bg-navy-500/98 border-t border-navy-400 px-6 py-6 flex flex-col gap-5">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)}
              className="text-xs tracking-widest uppercase text-cream-300 hover:text-tan-300 transition-colors">
              {link.label}
            </a>
          ))}
          <a href="#contact" onClick={() => setMenuOpen(false)}
            className="inline-block w-fit px-5 py-2.5 border border-tan-400 text-tan-300 text-xs tracking-widest uppercase">
            Free Quote
          </a>
        </div>
      )}
    </header>
  );
}
