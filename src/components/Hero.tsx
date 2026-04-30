import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">

      {/* ── Split photo background ── */}
      {/* Left photo: bathroom-master-3 */}
      <div className="absolute inset-y-0 left-0 w-1/2 z-0">
        <Image
          src="/images/bathroom-master-3.jpg"
          alt="Master bathroom remodel"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center"
        />
        {/* Left dark overlay — heavier on the right edge to blend toward center */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to right, rgba(15,25,33,0.72) 0%, rgba(15,25,33,0.82) 100%)" }} />
      </div>

      {/* Right photo: bathroom-remodel-3 */}
      <div className="absolute inset-y-0 right-0 w-1/2 z-0">
        <Image
          src="/images/bathroom-remodel-3.jpg"
          alt="Bathroom remodel"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center"
        />
        {/* Right dark overlay — heavier on the left edge to blend toward center */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to left, rgba(15,25,33,0.72) 0%, rgba(15,25,33,0.82) 100%)" }} />
      </div>

      {/* Center vignette to unify both photos behind the logo */}
      <div className="absolute inset-0 z-[1]"
        style={{ background: "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(15,25,33,0.30) 0%, rgba(15,25,33,0.0) 70%)" }} />

      {/* Thin center divider line — subtle seam */}
      <div className="absolute inset-y-0 left-1/2 -translate-x-px w-px z-[2]"
        style={{ background: "linear-gradient(to bottom, transparent 0%, rgba(220,215,201,0.15) 30%, rgba(220,215,201,0.15) 70%, transparent 100%)" }} />

      {/* ── Foreground content ── */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto w-full">

        {/* Eyebrow */}
        <p className="text-tan-300 text-xs tracking-[0.4em] uppercase mb-6 drop-shadow-lg">
          Premium Residential Renovations · Dallas–Fort Worth
        </p>

        {/* LOGO — the hero centerpiece, with a subtle backing glow */}
        <div className="flex justify-center mb-8 relative">
          {/* Soft glow behind the logo so it pops off both photos */}
          <div className="absolute inset-0 blur-2xl opacity-30 rounded-lg"
            style={{ background: "rgba(15,25,33,0.9)" }} />
          <svg
            viewBox="0 0 520 134"
            className="relative w-full max-w-2xl drop-shadow-2xl"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Border */}
            <rect x="4" y="4" width="512" height="126" fill="none" stroke="#DCD7C9" strokeWidth="2" />
            {/* Corner dots */}
            <circle cx="12"  cy="12"  r="4.5" fill="#DCD7C9" />
            <circle cx="508" cy="12"  r="4.5" fill="#DCD7C9" />
            <circle cx="12"  cy="122" r="4.5" fill="#DCD7C9" />
            <circle cx="508" cy="122" r="4.5" fill="#DCD7C9" />
            {/* CRAFTWELL */}
            <text
              x="260" y="82"
              textAnchor="middle"
              fontFamily="Georgia,'Times New Roman',serif"
              fontWeight="700"
              fontSize="62"
              letterSpacing="6"
              fill="#FFFFFF"
            >
              CRAFTWELL
            </text>
            {/* CONSTRUCTION SERVICES */}
            <text
              x="260" y="112"
              textAnchor="middle"
              fontFamily="Georgia,'Times New Roman',serif"
              fontWeight="400"
              fontSize="16"
              letterSpacing="10"
              fill="#DCD7C9"
              opacity="0.9"
            >
              CONSTRUCTION SERVICES
            </text>
          </svg>
        </div>

        {/* Tagline */}
        <p className="text-tan-300 text-base md:text-lg italic tracking-wide mb-8 drop-shadow-lg"
          style={{ fontFamily: "var(--font-playfair)" }}>
          &ldquo;You&rsquo;re In Good Hands&rdquo;
        </p>

        {/* Subhead */}
        <p className="text-cream-300 text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-3 drop-shadow">
          Craftwell Construction Services brings 15 years of craftsmanship to
          every renovation — kitchens, bathrooms, full-scale remodels, and
          water damage restoration done right.
        </p>
        <p className="text-cream-500 text-sm max-w-xl mx-auto leading-relaxed mb-10">
          Serving Dallas, Plano, Frisco, Southlake, and the greater DFW area.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="#portfolio"
            className="px-8 py-4 bg-tan-500 text-white text-sm tracking-widest uppercase hover:bg-tan-600 transition-colors duration-200 w-full sm:w-auto text-center shadow-lg">
            View Our Work
          </a>
          <a href="#contact"
            className="px-8 py-4 border border-cream-300/50 bg-navy-900/30 text-cream-200 text-sm tracking-widest uppercase hover:border-tan-400 hover:text-tan-300 backdrop-blur-sm transition-all duration-200 w-full sm:w-auto text-center shadow-lg">
            Schedule an Appointment
          </a>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        <span className="text-cream-600 text-xs tracking-[0.2em] uppercase drop-shadow">Scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-cream-500 to-transparent animate-pulse" />
      </div>
    </section>
  );
}
