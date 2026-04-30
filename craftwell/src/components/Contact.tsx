"use client";

import { useState } from "react";

const contactInfo = [
  {
    label: "Phone",
    value: "(312) 555-0190",
    href: "tel:+13125550190",
  },
  {
    label: "Email",
    value: "hello@craftwellconstruction.com",
    href: "mailto:hello@craftwellconstruction.com",
  },
  {
    label: "Office",
    value: "Chicago, IL — Serving the Greater Metro Area",
    href: null,
  },
];

const budgetRanges = [
  "$150K – $300K",
  "$300K – $600K",
  "$600K – $1M",
  "$1M+",
  "Not sure yet",
];

const projectTypes = [
  "Kitchen Renovation",
  "Bathroom Remodel",
  "Home Addition",
  "Whole-Home Renovation",
  "Outdoor Living",
  "Custom Finishes",
  "Other",
];

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    projectType: "",
    budget: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire up to your form backend (Resend, Formspree, etc.)
    setSubmitted(true);
  };

  return (
    <section id="contact" className="py-28 bg-stone-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-16">
          {/* Left: Info */}
          <div className="lg:col-span-2">
            <p className="text-bronze-500 text-xs tracking-[0.3em] uppercase mb-4">
              Get In Touch
            </p>
            <h2
              className="text-stone-900 text-4xl md:text-5xl font-semibold leading-tight mb-8"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Let&rsquo;s Build
              <br />
              <span className="italic text-stone-500">Something Lasting</span>
            </h2>
            <p className="text-stone-500 leading-relaxed mb-12">
              Every Craftwell project begins with a conversation. Tell us about
              your vision and we&rsquo;ll schedule a complimentary consultation at
              your home.
            </p>

            <div className="space-y-8">
              {contactInfo.map((info) => (
                <div key={info.label}>
                  <p className="text-stone-400 text-xs tracking-widest uppercase mb-1">
                    {info.label}
                  </p>
                  {info.href ? (
                    <a
                      href={info.href}
                      className="text-stone-800 hover:text-bronze-600 transition-colors duration-200"
                    >
                      {info.value}
                    </a>
                  ) : (
                    <p className="text-stone-800">{info.value}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="mt-12 pt-12 border-t border-stone-200">
              <p className="text-stone-400 text-xs tracking-widest uppercase mb-4">
                Response Time
              </p>
              <p className="text-stone-600 text-sm leading-relaxed">
                We respond to all inquiries within one business day. For urgent
                matters, please call us directly.
              </p>
            </div>
          </div>

          {/* Right: Form */}
          <div className="lg:col-span-3">
            {submitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20">
                <div className="w-16 h-px bg-bronze-400 mx-auto mb-8" />
                <h3
                  className="text-stone-900 text-3xl font-semibold mb-4"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  Thank You
                </h3>
                <p className="text-stone-500 leading-relaxed max-w-sm">
                  We&rsquo;ve received your inquiry and will be in touch within one
                  business day to schedule your complimentary consultation.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-stone-500 text-xs tracking-widest uppercase mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={form.name}
                      onChange={handleChange}
                      className="w-full bg-white border border-stone-200 px-4 py-3 text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:border-bronze-400 transition-colors"
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-500 text-xs tracking-widest uppercase mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      className="w-full bg-white border border-stone-200 px-4 py-3 text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:border-bronze-400 transition-colors"
                      placeholder="jane@example.com"
                    />
                  </div>
                </div>

                {/* Phone + Project Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-stone-500 text-xs tracking-widest uppercase mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      className="w-full bg-white border border-stone-200 px-4 py-3 text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:border-bronze-400 transition-colors"
                      placeholder="(312) 555-0100"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-500 text-xs tracking-widest uppercase mb-2">
                      Project Type *
                    </label>
                    <select
                      name="projectType"
                      required
                      value={form.projectType}
                      onChange={handleChange}
                      className="w-full bg-white border border-stone-200 px-4 py-3 text-stone-900 text-sm focus:outline-none focus:border-bronze-400 transition-colors appearance-none"
                    >
                      <option value="" disabled>
                        Select one
                      </option>
                      {projectTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Budget */}
                <div>
                  <label className="block text-stone-500 text-xs tracking-widest uppercase mb-2">
                    Estimated Budget
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {budgetRanges.map((range) => (
                      <button
                        type="button"
                        key={range}
                        onClick={() =>
                          setForm((prev) => ({ ...prev, budget: range }))
                        }
                        className={`px-4 py-2 text-xs tracking-wider border transition-colors duration-150 ${
                          form.budget === range
                            ? "border-bronze-500 bg-bronze-500 text-white"
                            : "border-stone-200 text-stone-600 hover:border-bronze-300 hover:text-bronze-600"
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-stone-500 text-xs tracking-widest uppercase mb-2">
                    Tell Us About Your Project
                  </label>
                  <textarea
                    name="message"
                    rows={5}
                    value={form.message}
                    onChange={handleChange}
                    className="w-full bg-white border border-stone-200 px-4 py-3 text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:border-bronze-400 transition-colors resize-none"
                    placeholder="Describe your project goals, timeline, or any specific questions..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-stone-900 text-white text-sm tracking-widest uppercase hover:bg-bronze-600 transition-colors duration-200"
                >
                  Request a Consultation
                </button>

                <p className="text-stone-400 text-xs text-center">
                  By submitting, you agree to our privacy policy. We never share
                  your information.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
