const stats = [
  { value: "15+", label: "Years of Experience" },
  { value: "500+", label: "Projects Completed" },
  { value: "5★", label: "Google Rating" },
  { value: "DFW", label: "Serving the Metroplex" },
];

const values = [
  {
    title: "Quality Without Compromise",
    body: "We hold every project — and every trade partner — to the same high standard. If it's not right, we make it right. Every time.",
  },
  {
    title: "Honest, Clear Communication",
    body: "From first consultation to final walkthrough, you'll always know where your project stands. No surprises on timeline, scope, or budget.",
  },
  {
    title: "Craftsmanship That Lasts",
    body: "We take pride in work that stands the test of time. Every detail is reviewed before we consider a project complete.",
  },
  {
    title: "Insurance Claim Assistance",
    body: "With deep experience navigating insurance claims, Craftwell can help you document damage and work through the process — a valuable resource when you need it most.",
  },
];

export default function About() {
  return (
    <section id="about" className="py-28 bg-forest-500">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          {/* Left: Text */}
          <div>
            <p className="text-tan-300 text-xs tracking-[0.3em] uppercase mb-4">
              About Craftwell
            </p>
            <h2 className="text-white text-4xl md:text-5xl font-semibold leading-tight mb-8"
              style={{ fontFamily: "var(--font-playfair)" }}>
              Built on Integrity,
              <br />
              <span className="italic text-tan-300">Defined by Detail</span>
            </h2>
            <p className="text-cream-300 text-lg leading-relaxed mb-6">
              Craftwell Construction Services is a trusted residential renovation
              and construction company serving the greater Dallas–Fort Worth
              metroplex — built on the belief that every home deserves
              exceptional craftsmanship.
            </p>
            <p className="text-cream-500 leading-relaxed mb-12">
              Founded by owner Jeron Pearson, Craftwell has spent over 15 years
              delivering projects that exceed expectations — from kitchen and
              bathroom transformations to full-scale remodels and water damage
              restoration. Our reputation is built on quality work, honest
              communication, and relationships that keep clients coming back.
            </p>

            {/* Values */}
            <div className="space-y-8">
              {values.map((v) => (
                <div key={v.title} className="flex gap-5">
                  <div className="w-px bg-tan-500 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="text-white font-semibold mb-1"
                      style={{ fontFamily: "var(--font-playfair)" }}>
                      {v.title}
                    </h4>
                    <p className="text-cream-500 text-sm leading-relaxed">{v.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Stats + Logo block */}
          <div className="flex flex-col gap-8">
            {/* Large logo brand block */}
            <div className="relative w-full flex items-center justify-center p-10"
              style={{
                background: "linear-gradient(135deg, #1B201C 0%, #273E4F 60%, #1F3240 100%)",
                minHeight: "260px",
              }}>
              <svg
                viewBox="0 0 480 124"
                className="w-full"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="3" y="3" width="474" height="118" fill="none" stroke="#DCD7C9" strokeWidth="1.6" opacity="0.75" />
                <circle cx="11"  cy="11"  r="4" fill="#DCD7C9" opacity="0.75" />
                <circle cx="469" cy="11"  r="4" fill="#DCD7C9" opacity="0.75" />
                <circle cx="11"  cy="113" r="4" fill="#DCD7C9" opacity="0.75" />
                <circle cx="469" cy="113" r="4" fill="#DCD7C9" opacity="0.75" />
                <text x="240" y="72"
                  textAnchor="middle"
                  fontFamily="Georgia,'Times New Roman',serif"
                  fontWeight="700" fontSize="56" letterSpacing="5"
                  fill="#DCD7C9">
                  CRAFTWELL
                </text>
                <text x="240" y="100"
                  textAnchor="middle"
                  fontFamily="Georgia,'Times New Roman',serif"
                  fontWeight="400" fontSize="14" letterSpacing="8"
                  fill="#DCD7C9" opacity="0.8">
                  CONSTRUCTION SERVICES
                </text>
              </svg>
              {/* Corner accents */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t border-l border-tan-500 opacity-50" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t border-r border-tan-500 opacity-50" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b border-l border-tan-500 opacity-50" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b border-r border-tan-500 opacity-50" />
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-px bg-forest-400">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-forest-600 px-8 py-8">
                  <p className="text-tan-300 text-4xl font-semibold mb-1"
                    style={{ fontFamily: "var(--font-playfair)" }}>
                    {stat.value}
                  </p>
                  <p className="text-cream-600 text-xs tracking-wider uppercase">
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
