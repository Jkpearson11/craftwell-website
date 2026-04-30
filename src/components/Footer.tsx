const footerLinks = {
  Services: [
    "Kitchen Renovations",
    "Bathroom Remodels",
    "Full-Scale Remodels",
    "Water Damage Restoration",
    "Home Additions",
    "Repairs & Maintenance",
  ],
  Company: ["About Us", "Portfolio", "Reviews", "Free Consultation"],
  Contact: [
    "(817) 899-0624",
    "info@craftwellconstruction.com",
    "Garland, TX 75041",
  ],
};

export default function Footer() {
  return (
    <footer className="bg-navy-900 text-navy-200">
      {/* Top bar */}
      <div className="border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Brand */}
            <div className="lg:col-span-1">
              <svg viewBox="0 0 220 58" className="w-44 mb-6" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="216" height="54" fill="none" stroke="#DCD7C9" strokeWidth="1" opacity="0.5" />
                <circle cx="6"   cy="6"  r="2" fill="#DCD7C9" opacity="0.5" />
                <circle cx="214" cy="6"  r="2" fill="#DCD7C9" opacity="0.5" />
                <circle cx="6"   cy="52" r="2" fill="#DCD7C9" opacity="0.5" />
                <circle cx="214" cy="52" r="2" fill="#DCD7C9" opacity="0.5" />
                <text x="110" y="32" textAnchor="middle"
                  fontFamily="Georgia,'Times New Roman',serif"
                  fontWeight="700" fontSize="20" letterSpacing="2" fill="#DCD7C9" opacity="0.8">
                  CRAFTWELL
                </text>
                <text x="110" y="46" textAnchor="middle"
                  fontFamily="Georgia,'Times New Roman',serif"
                  fontWeight="400" fontSize="7" letterSpacing="4" fill="#DCD7C9" opacity="0.55">
                  CONSTRUCTION SERVICES
                </text>
              </svg>
              <p className="text-sm leading-relaxed mb-6 text-navy-300">
                Your trusted local expert for premium residential renovations
                and construction across the Dallas–Fort Worth metroplex.
              </p>
              <div className="flex gap-4">
                {["Google", "Facebook", "Instagram"].map((social) => (
                  <a key={social} href="#"
                    className="text-xs tracking-widest text-navy-400 hover:text-tan-400 transition-colors uppercase">
                    {social}
                  </a>
                ))}
              </div>
            </div>

            {/* Services */}
            <div>
              <p className="text-cream-300 text-xs tracking-[0.2em] uppercase mb-5 font-medium">Services</p>
              <ul className="space-y-3">
                {footerLinks.Services.map((link) => (
                  <li key={link}>
                    <a href="#services" className="text-sm hover:text-tan-400 transition-colors duration-200">{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="text-cream-300 text-xs tracking-[0.2em] uppercase mb-5 font-medium">Company</p>
              <ul className="space-y-3">
                {footerLinks.Company.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm hover:text-tan-400 transition-colors duration-200">{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="text-cream-300 text-xs tracking-[0.2em] uppercase mb-5 font-medium">Contact</p>
              <ul className="space-y-3">
                <li>
                  <a href="tel:+18178990624" className="text-sm hover:text-tan-400 transition-colors duration-200">
                    (817) 899-0624
                  </a>
                </li>
                <li>
                  <a href="mailto:info@craftwellconstruction.com" className="text-sm hover:text-tan-400 transition-colors duration-200 break-all">
                    info@craftwellconstruction.com
                  </a>
                </li>
                <li>
                  <span className="text-sm">Garland, TX 75041</span>
                </li>
                <li className="pt-2">
                  <a href="#contact"
                    className="inline-block px-5 py-2.5 border border-tan-500 text-tan-300 text-xs tracking-widest uppercase hover:bg-tan-500 hover:text-white transition-all duration-200">
                    Free Consultation
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-navy-500">
        <p>© {new Date().getFullYear()} Craftwell Construction Services. All rights reserved.</p>
        <p>Licensed & Insured · Serving the Greater DFW Metroplex</p>
      </div>
    </footer>
  );
}
