const reviews = [
  {
    name: "Marianne Galloway",
    initial: "M",
    stars: 5,
    date: "4 months ago",
    text: "5 stars are truly not enough! We've been working with Craftwell for about 6 months on a wide variety of projects, and we plan to keep going. The experience has been exceptional from day one. Respectful, friendly, honest, and extremely thorough. It felt like working with a true partner — someone who cared about quality and about making sure we understood each step. A++++ on all fronts.",
  },
  {
    name: "Jacob Biedebach",
    initial: "J",
    stars: 5,
    date: "2 months ago",
    text: "Jeron remodeled our master bathroom and did an excellent job. He and his guys were skilled, timely, and professional. Jeron finished the work on time and in budget. I have recommended him to several friends!",
  },
  {
    name: "Eddie Hinojoza",
    initial: "E",
    stars: 5,
    date: "4 months ago",
    text: "Extremely seamless process! From start to finish, I was kept in the loop, the price never changed and the work was outstanding. We couldn't be happier!",
  },
  {
    name: "Arbora Bryant",
    initial: "A",
    stars: 5,
    date: "4 months ago",
    text: "We were very pleased with Jeron's attention to detail, communication skills, and punctuality. He and the team showed up on time each day. Jeron took time to explain the work and was patient with our questions. He also demonstrated a willingness to listen to our thoughts and come up with solutions that worked best for us.",
  },
  {
    name: "Kelley Smith",
    initial: "K",
    stars: 5,
    date: "5 months ago",
    text: "They showed up on time, stayed consistent, and worked with a level of care you don't see often anymore. Overall, just a solid group of guys who do quality work and treat your home like it matters.",
  },
  {
    name: "Craig Klement",
    initial: "C",
    stars: 5,
    date: "5 months ago",
    text: "Great experience with Craftwell! Super helpful, professional, and timely. Already planning our next project with them.",
  },
  {
    name: "Myca Teskey",
    initial: "M",
    stars: 5,
    date: "1 month ago",
    text: "Jeron is the real deal! He gave us exactly what we wanted and was on top of everything. Highly recommend.",
  },
  {
    name: "Ryan Savage",
    initial: "R",
    stars: 5,
    date: "4 months ago",
    text: "I recently hired Craftwell Construction for a home remodel and I couldn't be happier with the results. From the very first consultation, their team was professional, communicative, and genuinely invested in making my vision a reality.",
  },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-4 h-4 text-tan-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function Reviews() {
  return (
    <section id="reviews" className="py-28 bg-navy-500">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-tan-300 text-xs tracking-[0.3em] uppercase mb-4">
            Verified Google Reviews
          </p>
          <h2 className="text-white text-4xl md:text-5xl font-semibold leading-tight mb-6"
            style={{ fontFamily: "var(--font-playfair)" }}>
            What Our Clients Say
          </h2>
          <div className="flex items-center justify-center gap-3">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(i => (
                <svg key={i} className="w-5 h-5 text-tan-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-cream-300 text-sm font-medium">5.0 · {reviews.length} Reviews on Google</span>
            <span className="text-navy-300">·</span>
            <a href="https://www.google.com/maps/search/Craftwell+Construction+Services+Garland+TX"
              target="_blank" rel="noopener noreferrer"
              className="text-tan-300 text-sm hover:text-tan-200 underline underline-offset-2 transition-colors">
              See all →
            </a>
          </div>
        </div>

        {/* Review grid — 2 cols, 4 rows */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {reviews.map((review) => (
            <div key={`${review.name}-${review.date}`}
              className="bg-navy-600 border border-navy-400 p-7 relative flex flex-col">
              {/* Big decorative quote */}
              <div className="absolute top-4 right-6 text-tan-500/15 text-8xl font-serif leading-none select-none pointer-events-none"
                style={{ fontFamily: "Georgia, serif" }}>&ldquo;</div>

              {/* Stars */}
              <StarRating count={review.stars} />

              {/* Review text */}
              <p className="text-cream-300 text-sm leading-relaxed mt-4 mb-6 relative z-10 flex-1">
                &ldquo;{review.text}&rdquo;
              </p>

              {/* Reviewer footer */}
              <div className="flex items-center justify-between border-t border-navy-400 pt-4 mt-auto">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-tan-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {review.initial}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium leading-tight">{review.name}</p>
                    <p className="text-navy-300 text-xs">{review.date}</p>
                  </div>
                </div>
                <GoogleIcon />
              </div>
            </div>
          ))}
        </div>

        {/* CTA row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
          <a href="https://www.google.com/maps/search/Craftwell+Construction+Services+Garland+TX"
            target="_blank" rel="noopener noreferrer"
            className="px-8 py-4 border border-tan-400 text-tan-300 text-sm tracking-widest uppercase hover:bg-tan-500 hover:text-white hover:border-tan-500 transition-all duration-200">
            Leave Us a Review
          </a>
          <a href="#contact"
            className="px-8 py-4 bg-tan-500 text-white text-sm tracking-widest uppercase hover:bg-tan-600 transition-colors duration-200">
            Request a Free Consultation
          </a>
        </div>

      </div>
    </section>
  );
}
