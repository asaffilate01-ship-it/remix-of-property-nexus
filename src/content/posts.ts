export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  author: string;
  date: string;
  readMins: number;
  tags: string[];
  body: string[];
};

export const POSTS: Post[] = [
  {
    slug: "uk-rental-yields-2026",
    title: "Where UK rental yields are highest in 2026",
    excerpt: "Manchester, Glasgow and Newcastle continue to outpace London on gross yield — here's the data and where it's heading next.",
    cover: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80",
    author: "Priya Nair",
    date: "2026-05-22",
    readMins: 6,
    tags: ["Market", "Landlords"],
    body: [
      "Gross yields across the North West and Scotland are running 180–220 basis points ahead of Prime Central London, driven by stubborn rental demand and softer capital values.",
      "Our analysis of 412,000 active tenancies shows Chorlton (M21), Jesmond (NE2) and Kelvinbridge (G12) leading the pack, with average gross yields between 4.5% and 5.0%.",
      "The takeaway for portfolio landlords: rebalancing 10–15% of London stock into regional cities materially improves cash-on-cash returns without sacrificing void resilience.",
    ],
  },
  {
    slug: "renters-reform-act-what-changes",
    title: "Renters' Reform Act: what actually changes for landlords",
    excerpt: "Section 21 is gone. Periodic tenancies are default. Here's the operational playbook for the new regime.",
    cover: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1600&q=80",
    author: "James Holloway",
    date: "2026-04-14",
    readMins: 8,
    tags: ["Compliance", "Landlords"],
    body: [
      "The abolition of Section 21 means every possession claim now runs through Section 8 grounds. Documentation discipline is no longer optional.",
      "Periodic tenancies become the default — fixed terms above 12 months are out. This changes how rent reviews and notice periods are structured.",
      "Estately's compliance engine auto-flags affected tenancies and pre-fills the new prescribed forms. Onboarding takes under 10 minutes.",
    ],
  },
  {
    slug: "ai-listing-copy-that-converts",
    title: "Listing copy that converts: an AI playbook",
    excerpt: "We tested 14,000 AI-generated listings against agent-written controls. The result wasn't what we expected.",
    cover: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1600&q=80",
    author: "Sofia Marchetti",
    date: "2026-03-02",
    readMins: 5,
    tags: ["AI", "Agents"],
    body: [
      "AI-generated descriptions outperformed agent-written copy on click-through by 18%, but only when the prompt included three property-specific facts.",
      "Generic AI copy underperformed both human and fact-anchored AI — the lesson is that grounding matters more than model size.",
      "Estately's generator forces structured facts into the prompt and produces headline, summary, bullets and social caption in one pass.",
    ],
  },
];

export const getPost = (slug: string) => POSTS.find((p) => p.slug === slug);
