const footerLinks = {
  Services: [
    "Kitchen Renovations",
    "Bathroom Remodels",
    "Home Additions",
    "Whole-Home Renovations",
    "Outdoor Living",
    "Custom Finishes",
  ],
  Company: ["About Us", "Portfolio", "Process", "Testimonials", "Careers"],
  Legal: ["Privacy Policy", "Terms of Service", "License Info"],
};

export default function Footer() {
  return (
    <footer className="bg-stone-950 text-stone-400">
      {/* Top bar */}
      <div className="border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-7 h-7 border-2 border-bronze-500 rotate-45" />
                <span
                  className="font-serif text-xl font-semibold text-white"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  Craftwell
                </span>
              </div>
              <p className="text-sm leading-relaxed mb-6">
                Premium residential renovations for the discerning homeowner.
                Serving the greater Chicago area since 2006.
              </p>
              <div className="flex gap-4">
                {["Houzz", "Instagram", "Pinterest"].map((social) => (
                  <a
                    key={social}
                    href="#"
                    className="text-xs tracking-widest text-stone-600 hover:text-bronze-400 transition-colors uppercase"
                  >
                    {social}
                  </a>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {Object.entries(footerLinks).map(([group, links]) => (
              <div key={group}>
                <p className="text-white text-xs tracking-[0.2em] uppercase mb-5 font-medium">
                  {group}
                </p>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm hover:text-bronze-400 transition-colors duration-200"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-600">
        <p>© {new Date().getFullYear()} Craftwell Construction, LLC. All rights reserved.</p>
        <p>Licensed & Insured · Illinois Lic. #123456789</p>
      </div>
    </footer>
  );
}
