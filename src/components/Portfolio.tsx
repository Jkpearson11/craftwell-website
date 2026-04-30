"use client";

import Image from "next/image";
import { useState } from "react";

const slides = [
  { img: "/images/bathroom-master-1.jpg", title: "Master Bathroom Remodel",   category: "Bathroom Remodel" },
  { img: "/images/living-room-1.jpg",      title: "Living Room Renovation",    category: "Interior Renovation" },
  { img: "/images/bathroom-master-2.jpg", title: "Spa Bathroom Remodel",      category: "Bathroom Remodel" },
  { img: "/images/bathroom-master-3.jpg", title: "Custom Shower Detail",       category: "Bathroom Remodel" },
  { img: "/images/bathroom-remodel-1.jpg",title: "Bathroom Renovation",        category: "Bathroom Remodel" },
  { img: "/images/bathroom-remodel-2.jpg",title: "Custom Tile & Vanity",       category: "Bathroom Remodel" },
  { img: "/images/living-room-2.jpg",      title: "Whole-Home Renovation",     category: "Interior Renovation" },
  { img: "/images/interior-room.jpg",      title: "Interior Remodel",          category: "Interior Renovation" },
  { img: "/images/deck-outdoor.jpg",       title: "Deck & Outdoor Living",     category: "Outdoor" },
  { img: "/images/exterior.jpg",           title: "Exterior Renovation",       category: "Exterior" },
  { img: "/images/kitchen-countertop.jpg", title: "Custom Butcher Block",      category: "Kitchen" },
];

export default function Portfolio() {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c - 1 + slides.length) % slides.length);
  const next = () => setCurrent((c) => (c + 1) % slides.length);

  // Visible slide indexes: prev, current, next, next+1 (for the peek effect)
  const getSlideIndex = (offset: number) =>
    (current + offset + slides.length) % slides.length;

  return (
    <section id="portfolio" className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <p className="text-tan-500 text-xs tracking-[0.3em] uppercase mb-3">Our Work</p>
            <h2 className="text-navy-500 text-4xl md:text-5xl font-semibold leading-tight"
              style={{ fontFamily: "var(--font-playfair)" }}>
              Where Vision Becomes
              <br />
              <span className="italic text-navy-300">Reality</span>
            </h2>
          </div>
          <p className="text-navy-400 max-w-sm text-sm leading-relaxed">
            A selection of recent projects across the Dallas–Fort Worth
            metroplex — each one a testament to the craftsmanship and care
            Craftwell brings to every home.
          </p>
        </div>

        {/* ── Carousel ── */}
        <div className="relative">

          {/* Slide track — shows current + peek of adjacent */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_0.45fr] gap-4 items-stretch">

            {/* Main slide */}
            <div className="relative overflow-hidden group" style={{ height: "480px" }}>
              <Image
                key={slides[getSlideIndex(0)].img}
                src={slides[getSlideIndex(0)].img}
                alt={slides[getSlideIndex(0)].title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-900/75 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p className="text-tan-300 text-xs tracking-widest uppercase mb-1">
                  {slides[getSlideIndex(0)].category}
                </p>
                <h3 className="text-white text-2xl font-semibold"
                  style={{ fontFamily: "var(--font-playfair)" }}>
                  {slides[getSlideIndex(0)].title}
                </h3>
              </div>
            </div>

            {/* Second slide */}
            <div
              className="relative overflow-hidden group cursor-pointer hidden md:block"
              style={{ height: "480px" }}
              onClick={next}
            >
              <Image
                key={slides[getSlideIndex(1)].img}
                src={slides[getSlideIndex(1)].img}
                alt={slides[getSlideIndex(1)].title}
                fill
                sizes="50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-900/75 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p className="text-tan-300 text-xs tracking-widest uppercase mb-1">
                  {slides[getSlideIndex(1)].category}
                </p>
                <h3 className="text-white text-xl font-semibold"
                  style={{ fontFamily: "var(--font-playfair)" }}>
                  {slides[getSlideIndex(1)].title}
                </h3>
              </div>
            </div>

            {/* Peek / third slide */}
            <div
              className="relative overflow-hidden group cursor-pointer hidden md:block opacity-60 hover:opacity-80 transition-opacity duration-300"
              style={{ height: "480px" }}
              onClick={next}
            >
              <Image
                key={slides[getSlideIndex(2)].img}
                src={slides[getSlideIndex(2)].img}
                alt={slides[getSlideIndex(2)].title}
                fill
                sizes="25vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-900/70 via-transparent to-transparent" />
              {/* Right-side fade to suggest more content */}
              <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white to-transparent" />
            </div>
          </div>

          {/* Prev / Next arrows */}
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center bg-navy-900/70 hover:bg-tan-500 border border-white/20 text-white transition-all duration-200 backdrop-blur-sm"
            aria-label="Previous photo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center bg-navy-900/70 hover:bg-tan-500 border border-white/20 text-white transition-all duration-200 backdrop-blur-sm"
            aria-label="Next photo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Thumbnail strip */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {slides.map((slide, i) => (
            <button
              key={slide.img}
              onClick={() => setCurrent(i)}
              className={`relative flex-shrink-0 overflow-hidden transition-all duration-200 ${
                i === current
                  ? "ring-2 ring-tan-400 opacity-100"
                  : "opacity-50 hover:opacity-75"
              }`}
              style={{ width: "72px", height: "52px" }}
              aria-label={`Go to ${slide.title}`}
            >
              <Image
                src={slide.img}
                alt={slide.title}
                fill
                sizes="72px"
                className="object-cover"
              />
            </button>
          ))}
        </div>

        {/* Counter + CTA */}
        <div className="flex items-center justify-between mt-6">
          <p className="text-navy-300 text-sm">
            <span className="text-navy-500 font-semibold">{current + 1}</span>
            <span className="text-navy-300"> / {slides.length}</span>
          </p>
          <a href="#contact"
            className="px-8 py-3 bg-navy-500 text-white text-sm tracking-widest uppercase hover:bg-tan-600 transition-colors duration-200">
            Start Your Project
          </a>
        </div>

      </div>
    </section>
  );
}
