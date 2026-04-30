const services = [
  {
    icon: "◈",
    title: "Kitchen Renovations",
    description:
      "Custom cabinetry, premium countertops, professional-grade appliances, and layouts designed around the way you actually live.",
    details: ["Custom millwork", "Quartz & marble surfaces", "Appliance integration", "Lighting design"],
  },
  {
    icon: "◇",
    title: "Bathroom Remodels",
    description:
      "Spa-caliber retreats with designer fixtures, custom tilework, walk-in showers, and freestanding soaking tubs built to last.",
    details: ["Custom tilework", "Walk-in showers", "Vanity & fixture upgrades", "Radiant floor heating"],
  },
  {
    icon: "⬡",
    title: "Full-Scale Remodels",
    description:
      "End-to-end transformations that reimagine your entire floor plan with cohesive design, materials, and craftsmanship.",
    details: ["Floor plan redesign", "Structural changes", "Electrical & plumbing", "Project management"],
  },
  {
    icon: "◉",
    title: "Water Damage Restoration",
    description:
      "Fast, thorough restoration after water damage — with insurance claim expertise that maximizes your payout and minimizes your stress.",
    details: ["Insurance claim navigation", "Moisture remediation", "Full rebuild services", "Documentation support"],
  },
  {
    icon: "◈",
    title: "Home Additions",
    description:
      "Seamlessly integrated additions — sunrooms, primary suite expansions, and extra living areas — that feel like they've always been there.",
    details: ["Permit management", "Architectural design", "Foundation work", "Seamless integration"],
  },
  {
    icon: "◇",
    title: "Repairs & Maintenance",
    description:
      "From quick repairs to routine upkeep, we keep your home in peak condition with the same care we bring to major renovations.",
    details: ["Interior & exterior repairs", "Preventive maintenance", "Storm damage repair", "Handyman services"],
  },
];

export default function Services() {
  return (
    <section id="services" className="py-28 bg-cream-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-2xl mb-20">
          <p className="text-tan-500 text-xs tracking-[0.3em] uppercase mb-4">
            What We Build
          </p>
          <h2 className="text-navy-500 text-4xl md:text-5xl font-semibold leading-tight mb-6"
            style={{ fontFamily: "var(--font-playfair)" }}>
            Services Built Around
            <br />
            <span className="italic text-navy-300">Your Vision</span>
          </h2>
          <p className="text-navy-400 text-lg leading-relaxed">
            Every project begins with listening. We combine 15 years of
            craftsmanship with honest communication to deliver results that
            exceed expectations — and stand the test of time.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-cream-300">
          {services.map((service) => (
            <div key={service.title}
              className="bg-cream-100 p-10 hover:bg-white transition-colors duration-300 group">
              <span className="text-tan-400 text-2xl block mb-6">{service.icon}</span>
              <h3 className="text-navy-500 text-xl font-semibold mb-4 group-hover:text-tan-600 transition-colors duration-200"
                style={{ fontFamily: "var(--font-playfair)" }}>
                {service.title}
              </h3>
              <p className="text-navy-400 text-sm leading-relaxed mb-6">
                {service.description}
              </p>
              <ul className="space-y-2">
                {service.details.map((detail) => (
                  <li key={detail} className="flex items-center gap-2 text-xs text-tan-500 uppercase tracking-wider">
                    <span className="w-3 h-px bg-tan-400 block" />
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
