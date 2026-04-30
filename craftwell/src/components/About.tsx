const stats = [
  { value: "18+", label: "Years of Experience" },
  { value: "340+", label: "Projects Completed" },
  { value: "100%", label: "Client Satisfaction" },
  { value: "$2M+", label: "Average Project Value" },
];

const values = [
  {
    title: "Uncompromising Quality",
    body: "We source materials from the finest suppliers and hold every subcontractor to the same standard we hold ourselves.",
  },
  {
    title: "Transparent Partnership",
    body: "You'll always know where your project stands — no surprises on timeline, scope, or budget.",
  },
  {
    title: "Precision Craftsmanship",
    body: "Every joint, seam, and finish is reviewed against the highest standards before we consider it done.",
  },
];

export default function About() {
  return (
    <section id="about" className="py-28 bg-stone-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          {/* Left: Text */}
          <div>
            <p className="text-bronze-400 text-xs tracking-[0.3em] uppercase mb-4">
              About Craftwell
            </p>
            <h2
              className="text-white text-4xl md:text-5xl font-semibold leading-tight mb-8"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Built on Integrity,
              <br />
              <span className="italic text-bronze-300">Defined by Detail</span>
            </h2>
            <p className="text-stone-400 text-lg leading-relaxed mb-6">
              Craftwell was founded on a simple belief: that the homes our
              clients invest in deserve the same care and attention a master
              craftsman would give to a piece of heirloom furniture.
            </p>
            <p className="text-stone-500 leading-relaxed mb-12">
              For over 18 years we&rsquo;ve worked exclusively in the premium residential
              renovation market, building a reputation for projects that deliver
              on their design intent — beautifully, on time, and on budget.
              Our team includes licensed architects, interior designers, master
              carpenters, and a network of best-in-class trade partners.
            </p>

            {/* Values */}
            <div className="space-y-8">
              {values.map((v) => (
                <div key={v.title} className="flex gap-5">
                  <div className="w-px bg-bronze-500 flex-shrink-0 mt-1" />
                  <div>
                    <h4
                      className="text-white font-semibold mb-1"
                      style={{ fontFamily: "var(--font-playfair)" }}
                    >
                      {v.title}
                    </h4>
                    <p className="text-stone-500 text-sm leading-relaxed">{v.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Stats + Visual */}
          <div className="flex flex-col gap-8">
            {/* Decorative block */}
            <div
              className="relative h-72 w-full"
              style={{
                background:
                  "linear-gradient(135deg, #292524 0%, #1C1917 50%, #44403C 100%)",
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div
                    className="text-bronze-400 text-6xl font-semibold mb-2"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    CW
                  </div>
                  <div className="w-12 h-px bg-bronze-500 mx-auto mb-2" />
                  <p className="text-stone-500 text-xs tracking-widest uppercase">
                    Est. 2006
                  </p>
                </div>
              </div>
              {/* Corner accents */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t border-l border-bronze-500 opacity-60" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t border-r border-bronze-500 opacity-60" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b border-l border-bronze-500 opacity-60" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b border-r border-bronze-500 opacity-60" />
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-px bg-stone-700">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-stone-800 px-8 py-8">
                  <p
                    className="text-bronze-300 text-4xl font-semibold mb-1"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-stone-500 text-xs tracking-wider uppercase">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
