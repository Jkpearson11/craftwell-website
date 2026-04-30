const services = [
  {
    icon: "◈",
    title: "Kitchen Renovations",
    description:
      "Custom cabinetry, premium countertops, professional-grade appliances, and layouts designed around the way you actually live.",
    details: ["Custom millwork", "Quartz & marble surfaces", "Smart appliance integration", "Lighting design"],
  },
  {
    icon: "◇",
    title: "Bathroom Remodels",
    description:
      "Spa-caliber retreats with radiant heat, designer fixtures, steam showers, and freestanding soaking tubs.",
    details: ["Radiant floor heating", "Steam & rain showers", "Custom tilework", "Heated towel bars"],
  },
  {
    icon: "⬡",
    title: "Home Additions",
    description:
      "Seamlessly integrated additions — sunrooms, primary suite expansions, ADUs — that feel like they've always been there.",
    details: ["Full structural work", "Permit management", "Architectural design", "Seamless integration"],
  },
  {
    icon: "◉",
    title: "Whole-Home Renovations",
    description:
      "End-to-end transformations that reimagine your entire floor plan with cohesive design, materials, and craftsmanship.",
    details: ["Interior design consulting", "Structural changes", "Electrical & plumbing", "Project management"],
  },
  {
    icon: "◈",
    title: "Outdoor Living",
    description:
      "Covered patios, outdoor kitchens, pergolas, and entertainment areas that extend your living space outdoors year-round.",
    details: ["Covered structures", "Outdoor kitchens", "Custom hardscaping", "Lighting & electrical"],
  },
  {
    icon: "◇",
    title: "Custom Finishes",
    description:
      "The details that define a truly bespoke home — coffered ceilings, wainscoting, built-ins, and specialty plaster finishes.",
    details: ["Coffered ceilings", "Built-in cabinetry", "Decorative plaster", "Custom millwork"],
  },
];

export default function Services() {
  return (
    <section id="services" className="py-28 bg-stone-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-2xl mb-20">
          <p className="text-bronze-500 text-xs tracking-[0.3em] uppercase mb-4">
            What We Build
          </p>
          <h2
            className="text-stone-900 text-4xl md:text-5xl font-semibold leading-tight mb-6"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Services Built Around
            <br />
            <span className="italic text-stone-600">Your Vision</span>
          </h2>
          <p className="text-stone-500 text-lg leading-relaxed">
            Every project begins with listening. We combine precision
            craftsmanship with thoughtful design to deliver spaces that exceed
            expectations — and stand the test of time.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-stone-200">
          {services.map((service) => (
            <div
              key={service.title}
              className="bg-stone-50 p-10 hover:bg-white transition-colors duration-300 group"
            >
              <span className="text-bronze-400 text-2xl block mb-6">
                {service.icon}
              </span>
              <h3
                className="text-stone-900 text-xl font-semibold mb-4 group-hover:text-bronze-600 transition-colors duration-200"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {service.title}
              </h3>
              <p className="text-stone-500 text-sm leading-relaxed mb-6">
                {service.description}
              </p>
              <ul className="space-y-2">
                {service.details.map((detail) => (
                  <li key={detail} className="flex items-center gap-2 text-xs text-stone-400 uppercase tracking-wider">
                    <span className="w-3 h-px bg-bronze-400 block" />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
