const stats = [
  { value: "15+", label: "Years of Experience" },
  { value: "500+", label: "Projects Completed" },
  { value: "5.0★", label: "Google Rating" },
  { value: "DFW", label: "Metroplex Wide" },
];

export default function StatsBar() {
  return (
    <div className="bg-navy-500 border-b border-navy-400">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-navy-400">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center justify-center py-7 px-4 text-center">
              <p
                className="text-tan-300 text-3xl md:text-4xl font-semibold leading-none mb-1"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {stat.value}
              </p>
              <p className="text-cream-500 text-xs tracking-widest uppercase mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
