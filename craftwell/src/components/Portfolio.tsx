const projects = [
  {
    title: "Lakeside Primary Suite",
    category: "Master Suite Addition",
    location: "Lake Forest, IL",
    gradient: "linear-gradient(135deg, #2D2521 0%, #4A3728 100%)",
    size: "large",
  },
  {
    title: "Modern Chef's Kitchen",
    category: "Kitchen Renovation",
    location: "Winnetka, IL",
    gradient: "linear-gradient(135deg, #1E2A2A 0%, #2D3F3A 100%)",
    size: "small",
  },
  {
    title: "Spa Retreat Bathroom",
    category: "Bathroom Remodel",
    location: "Hinsdale, IL",
    gradient: "linear-gradient(135deg, #252028 0%, #382E3F 100%)",
    size: "small",
  },
  {
    title: "Rear Addition & Outdoor Living",
    category: "Home Addition",
    location: "Barrington, IL",
    gradient: "linear-gradient(135deg, #202820 0%, #2E3F2A 100%)",
    size: "small",
  },
  {
    title: "Historic Whole-Home Restoration",
    category: "Whole-Home Renovation",
    location: "Evanston, IL",
    gradient: "linear-gradient(135deg, #28221A 0%, #3F3020 100%)",
    size: "small",
  },
  {
    title: "Contemporary Great Room",
    category: "Interior Renovation",
    location: "Glencoe, IL",
    gradient: "linear-gradient(135deg, #1A1E28 0%, #252D3F 100%)",
    size: "large",
  },
];

export default function Portfolio() {
  return (
    <section id="portfolio" className="py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div>
            <p className="text-bronze-500 text-xs tracking-[0.3em] uppercase mb-4">
              Selected Projects
            </p>
            <h2
              className="text-stone-900 text-4xl md:text-5xl font-semibold leading-tight"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Where Vision Becomes
              <br />
              <span className="italic text-stone-500">Reality</span>
            </h2>
          </div>
          <p className="text-stone-500 max-w-sm text-sm leading-relaxed">
            A sampling of our recent work across the greater Chicago area.
            Each project is a unique collaboration with our clients.
          </p>
        </div>

        {/* Mosaic Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Row 1: large left + 2 small right */}
          <div
            className="relative overflow-hidden md:row-span-2 group cursor-pointer"
            style={{ minHeight: "340px", background: projects[0].gradient }}
          >
            <ProjectCard project={projects[0]} />
          </div>
          <div
            className="relative overflow-hidden group cursor-pointer"
            style={{ minHeight: "160px", background: projects[1].gradient }}
          >
            <ProjectCard project={projects[1]} />
          </div>
          <div
            className="relative overflow-hidden group cursor-pointer"
            style={{ minHeight: "160px", background: projects[2].gradient }}
          >
            <ProjectCard project={projects[2]} />
          </div>

          {/* Row 2: 2 small left + (large spans from above) */}
          <div
            className="relative overflow-hidden group cursor-pointer"
            style={{ minHeight: "160px", background: projects[3].gradient }}
          >
            <ProjectCard project={projects[3]} />
          </div>
          <div
            className="relative overflow-hidden group cursor-pointer"
            style={{ minHeight: "160px", background: projects[4].gradient }}
          >
            <ProjectCard project={projects[4]} />
          </div>

          {/* Row 3: full width */}
          <div
            className="relative overflow-hidden md:col-span-3 group cursor-pointer"
            style={{ minHeight: "240px", background: projects[5].gradient }}
          >
            <ProjectCard project={projects[5]} large />
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-14">
          <p className="text-stone-400 text-sm mb-5">
            These are placeholder cards — replace gradient blocks with your actual project photos.
          </p>
          <a
            href="#contact"
            className="inline-block px-8 py-4 bg-stone-900 text-white text-sm tracking-widest uppercase hover:bg-bronze-600 transition-colors duration-200"
          >
            Discuss Your Project
          </a>
        </div>
      </div>
    </section>
  );
}

function ProjectCard({
  project,
  large,
}: {
  project: (typeof projects)[0];
  large?: boolean;
}) {
  return (
    <>
      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/60 transition-colors duration-300" />

      {/* Corner accents */}
      <div className="absolute top-4 left-4 w-6 h-6 border-t border-l border-bronze-500/40 group-hover:border-bronze-400 transition-colors duration-300" />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b border-r border-bronze-500/40 group-hover:border-bronze-400 transition-colors duration-300" />

      {/* Text */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-6 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 ${large ? "flex items-end justify-between" : ""}`}
      >
        <div>
          <p className="text-bronze-300 text-xs tracking-widest uppercase mb-1">
            {project.category}
          </p>
          <h3
            className={`text-white font-semibold ${large ? "text-2xl" : "text-lg"}`}
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {project.title}
          </h3>
        </div>
        <p className="text-stone-400 text-xs tracking-wider">{project.location}</p>
      </div>
    </>
  );
}
