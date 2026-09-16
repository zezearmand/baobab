export const BRAND = {
  name: "Baobabweb",
  tagline: "Dakar → The World",
} as const;

export const HERO = {
  eyebrow: "Baobabweb",
  headline: ["BIENVENUE DANS", "L'EXPÉRIENCE BAOBAB"],
  sub: "Studio digital basé à Dakar. Design, développement et intelligence artificielle au service d'entreprises qui veulent grandir.",
  cta: "Démarrer un projet",
};

export type Service = {
  index: string;
  id: string;
  title: string;
  description: string;
};

export const SERVICES: Service[] = [
  {
    index: "01",
    id: "web-design",
    title: "Web Design",
    description:
      "Direction artistique, composition et typographie au service d'une identité forte et mémorable.",
  },
  {
    index: "02",
    id: "developpement",
    title: "Développement",
    description:
      "Architectures robustes, code propre et scalable — du prototype au produit en production.",
  },
  {
    index: "03",
    id: "performance",
    title: "Performance",
    description:
      "Vitesse, Core Web Vitals et fluidité perçue : chaque milliseconde compte pour vos utilisateurs.",
  },
  {
    index: "04",
    id: "seo",
    title: "SEO",
    description:
      "Indexation, structure sémantique et autorité de domaine pour être trouvé au bon moment.",
  },
  {
    index: "05",
    id: "ia",
    title: "Intelligence Artificielle",
    description:
      "Automatisations et expériences augmentées par l'IA, pensées pour un usage réel et mesurable.",
  },
  {
    index: "06",
    id: "maintenance",
    title: "Maintenance",
    description:
      "Supervision continue, mises à jour et évolution du produit bien après la mise en ligne.",
  },
];

export type Project = {
  id: string;
  name: string;
  category: string;
  year: string;
  blurb: string;
};

export const PROJECTS: Project[] = [
  {
    id: "teranga-market",
    name: "Teranga Market",
    category: "E-commerce · Direction artistique",
    year: "2025",
    blurb: "Plateforme e-commerce pour artisans sénégalais — de la vitrine au paiement.",
  },
  {
    id: "wave-analytics",
    name: "Wave Analytics",
    category: "Produit SaaS · Développement",
    year: "2025",
    blurb: "Dashboard temps réel pour PME, pensé pour la vitesse et la clarté des données.",
  },
  {
    id: "sahel-capital",
    name: "Sahel Capital",
    category: "Corporate · Performance & SEO",
    year: "2024",
    blurb: "Refonte complète d'une plateforme d'investissement, +40% de trafic organique.",
  },
  {
    id: "nomad-ai",
    name: "Nomad AI",
    category: "IA · Produit",
    year: "2024",
    blurb: "Assistant conversationnel intégré à un parcours client omnicanal.",
  },
  {
    id: "baobab-health",
    name: "Baobab Health",
    category: "Plateforme santé · Développement",
    year: "2023",
    blurb: "Prise de rendez-vous et dossier patient pour un réseau de cliniques.",
  },
];

export const TECHNOLOGY = {
  headline: "BUILT FOR THE MODERN WEB.",
  pillars: ["PERFORMANCE", "IA", "AUTOMATISATION", "CLOUD", "SCALE"],
  signature: "L'expérience est simple parce que l'ingénierie ne l'est pas.",
};

export type ProcessStep = {
  index: string;
  title: string;
  description: string;
};

export const PROCESS: ProcessStep[] = [
  { index: "01", title: "Découvrir", description: "Immersion dans votre marché, vos objectifs et vos utilisateurs." },
  { index: "02", title: "Stratégiser", description: "Définition d'une feuille de route claire et mesurable." },
  { index: "03", title: "Designer", description: "Exploration visuelle et prototypage de l'expérience." },
  { index: "04", title: "Construire", description: "Développement, intégration et tests rigoureux." },
  { index: "05", title: "Lancer", description: "Mise en ligne, supervision et premiers résultats." },
  { index: "06", title: "Évoluer", description: "Optimisation continue basée sur la donnée réelle." },
];

export type PricingTier = {
  name: string;
  price: string;
  description: string;
  features: string[];
  featured?: boolean;
};

export const PRICING: PricingTier[] = [
  {
    name: "Starter",
    price: "75 000 FCFA+",
    description: "Pour lancer une présence en ligne solide et professionnelle.",
    features: ["Site vitrine sur-mesure", "Design responsive", "SEO de base", "1 mois de support"],
  },
  {
    name: "Pro",
    price: "150 000 FCFA+",
    description: "Pour les entreprises qui veulent convertir et grandir.",
    features: ["Site multi-pages", "Animations avancées", "SEO approfondi", "3 mois de support"],
    featured: true,
  },
  {
    name: "Premium",
    price: "300 000 FCFA+",
    description: "Pour des produits digitaux ambitieux et sur mesure.",
    features: ["Produit web complet", "Expériences 3D / motion", "IA & automatisations", "Support continu"],
  },
];

export const CONTACT = {
  headline: ["LET'S BUILD", "SOMETHING GREAT."],
  cta: "Construisons quelque chose qui grandit.",
  email: "hello@baobabweb.com",
};

export const CHAPTERS = [
  { id: "hero", label: "VISION" },
  { id: "services", label: "CRAFT" },
  { id: "portfolio", label: "WORK" },
  { id: "technology", label: "ENGINE" },
  { id: "process", label: "METHOD" },
  { id: "pricing", label: "SCALE" },
  { id: "contact", label: "FUTURE" },
] as const;

export type ChapterId = (typeof CHAPTERS)[number]["id"];
