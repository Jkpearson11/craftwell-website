"use client";

import { useState } from "react";

// ─── Replace this with your Web3Forms access key ───────────────────────────
// Get one free at https://web3forms.com — enter info@craftwellconstruction.com
const WEB3FORMS_KEY = "c53aab8c-a2d0-4ea5-89fd-0bf6fd9e3209";
// ───────────────────────────────────────────────────────────────────────────

const contactInfo = [
  {
    label: "Phone",
    value: "(817) 899-0624",
    href: "tel:+18178990624",
  },
  {
    label: "Email",
    value: "info@craftwellconstruction.com",
    href: "mailto:info@craftwellconstruction.com",
  },
  {
    label: "Location",
    value: "Serving the Greater DFW Area",
    href: null,
  },
];

const budgetRanges = [
  "Under $25K",
  "$25K – $75K",
  "$75K – $150K",
  "$150K+",
  "Not sure yet",
];

const projectTypes = [
  "Kitchen Renovation",
  "Bathroom Remodel",
  "Full-Scale Remodel",
  "Water Damage Restoration",
  "Home Addition",
  "Repairs & Maintenance",
  "Other",
];

export default function Contact() {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", projectType: "", budget: "", message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const subject = `New Project Inquiry – Craftwell | ${form.projectType || "General"} from ${form.name}`;

    const payload = {
      access_key: WEB3FORMS_KEY,
      subject,
      from_name: "Craftwell Website",
      name: form.name,
      email: form.email,
      phone: form.phone || "Not provided",
      project_type: form.projectType,
      budget: form.budget || "Not specified",
      message: form.message || "No message provided",
    };

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="py-28 bg-cream-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-16">

          {/* Left: Info */}
          <div className="lg:col-span-2">
            <p className="text-tan-500 text-xs tracking-[0.3em] uppercase mb-4">
              Get In Touch
            </p>
            <h2 className="text-navy-500 text-4xl md:text-5xl font-semibold leading-tight mb-8"
              style={{ fontFamily: "var(--font-playfair)" }}>
              Let&rsquo;s Build
              <br />
              <span className="italic text-navy-300">Something Lasting</span>
            </h2>
            <p className="text-navy-400 leading-relaxed mb-12">
              Every Craftwell project starts with a conversation. Tell us about
              your vision and we&rsquo;ll schedule a free consultation at your home.
            </p>

            <div className="space-y-8">
              {contactInfo.map((info) => (
                <div key={info.label}>
                  <p className="text-tan-500 text-xs tracking-widest uppercase mb-1">
                    {info.label}
                  </p>
                  {info.href ? (
                    <a href={info.href}
                      className="text-navy-500 hover:text-tan-600 transition-colors duration-200 font-medium">
                      {info.value}
                    </a>
                  ) : (
                    <p className="text-navy-500">{info.value}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-12 pt-12 border-t border-cream-300">
              <p className="text-tan-500 text-xs tracking-widest uppercase mb-4">
                Free Consultations
              </p>
              <p className="text-navy-400 text-sm leading-relaxed">
                We offer free in-home consultations across the DFW metroplex.
                We respond to all inquiries within one business day.
              </p>
            </div>
          </div>

          {/* Right: Form */}
          <div className="lg:col-span-3">
            {submitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20">
                <div className="w-16 h-px bg-tan-400 mx-auto mb-8" />
                <h3 className="text-navy-500 text-3xl font-semibold mb-4"
                  style={{ fontFamily: "var(--font-playfair)" }}>
                  Thank You
                </h3>
                <p className="text-navy-400 leading-relaxed max-w-sm">
                  We&rsquo;ve received your inquiry and will be in touch within one
                  business day to schedule your free consultation.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-navy-400 text-xs tracking-widest uppercase mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text" name="name" required
                      value={form.name} onChange={handleChange}
                      className="w-full bg-white border border-cream-300 px-4 py-3 text-navy-500 text-sm placeholder:text-cream-500 focus:outline-none focus:border-tan-400 transition-colors"
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-navy-400 text-xs tracking-widest uppercase mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email" name="email" required
                      value={form.email} onChange={handleChange}
                      className="w-full bg-white border border-cream-300 px-4 py-3 text-navy-500 text-sm placeholder:text-cream-500 focus:outline-none focus:border-tan-400 transition-colors"
                      placeholder="jane@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-navy-400 text-xs tracking-widest uppercase mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel" name="phone"
                      value={form.phone} onChange={handleChange}
                      className="w-full bg-white border border-cream-300 px-4 py-3 text-navy-500 text-sm placeholder:text-cream-500 focus:outline-none focus:border-tan-400 transition-colors"
                      placeholder="(817) 555-0100"
                    />
                  </div>
                  <div>
                    <label className="block text-navy-400 text-xs tracking-widest uppercase mb-2">
                      Project Type *
                    </label>
                    <select
                      name="projectType" required
                      value={form.projectType} onChange={handleChange}
                      className="w-full bg-white border border-cream-300 px-4 py-3 text-navy-500 text-sm focus:outline-none focus:border-tan-400 transition-colors appearance-none">
                      <option value="" disabled>Select one</option>
                      {projectTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-navy-400 text-xs tracking-widest uppercase mb-2">
                    Estimated Budget
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {budgetRanges.map((range) => (
                      <button
                        type="button" key={range}
                        onClick={() => setForm((prev) => ({ ...prev, budget: range }))}
                        className={`px-4 py-2 text-xs tracking-wider border transition-colors duration-150 ${
                          form.budget === range
                            ? "border-tan-500 bg-tan-500 text-white"
                            : "border-cream-300 text-navy-400 hover:border-tan-300 hover:text-tan-600"
                        }`}>
                        {range}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-navy-400 text-xs tracking-widest uppercase mb-2">
                    Tell Us About Your Project
                  </label>
                  <textarea
                    name="message" rows={5}
                    value={form.message} onChange={handleChange}
                    className="w-full bg-white border border-cream-300 px-4 py-3 text-navy-500 text-sm placeholder:text-cream-500 focus:outline-none focus:border-tan-400 transition-colors resize-none"
                    placeholder="Describe your project goals, timeline, or any specific questions..."
                  />
                </div>

                {error && (
                  <p className="text-red-600 text-sm text-center">
                    Something went wrong. Please try again or call us at (817) 899-0624.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-navy-500 text-white text-sm tracking-widest uppercase hover:bg-tan-600 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading ? "Sending…" : "Request a Free Consultation"}
                </button>

                <p className="text-cream-500 text-xs text-center">
                  By submitting, you agree to our privacy policy. We never share your information.
                </p>

              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
