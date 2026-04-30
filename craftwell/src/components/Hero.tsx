export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient simulating a dark interior photo */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(135deg, #0C0A09 0%, #1C1917 40%, #292524 70%, #1C1917 100%)",
        }}
      />

      {/* Decorative texture overlay */}
      <div
        className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 40px,
            rgba(166,124,82,0.08) 40px,
            rgba(166,124,82,0.08) 41px
          )`,
        }}
      />

      {/* Subtle warm glow */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-1/2 z-0 opacity-20 blur-3xl rounded-full"
        style={{ background: "radial-gradient(ellipse, #A67C52, transparent)" }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Eyebrow */}
        <p className="text-bronze-300 text-xs tracking-[0.3em] uppercase mb-6 font-sans">
          Premium Residential Renovations
        </p>

        {/* Headline */}
        <h1
          className="text-white text-5xl md:text-7xl lg:text-8xl font-semibold leading-tight mb-8"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Crafted for the
          <br />
          <span className="text-bronze-300 italic">Exceptional</span> Home
        </h1>

        {/* Subhead */}
        <p className="text-stone-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-12">
          We transform residences into refined living spaces — from bespoke
          kitchen renovations and spa-quality bathrooms to full-scale additions
          and custom finishes.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#portfolio"
            className="px-8 py-4 bg-bronze-500 text-white text-sm tracking-widest uppercase hover:bg-bronze-600 transition-colors duration-200 w-full sm:w-auto text-center"
          >
            View Our Work
          </a>
          <a
            href="#contact"
            className="px-8 py-4 border border-stone-600 text-stone-300 text-sm tracking-widest uppercase hover:border-bronze-400 hover:text-bronze-300 transition-colors duration-200 w-full sm:w-auto text-center"
          >
            Start Your Project
          </a>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        <span className="text-stone-600 text-xs tracking-[0.2em] uppercase">Scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-stone-600 to-transparent animate-pulse" />
      </div>
    </section>
  );
}
