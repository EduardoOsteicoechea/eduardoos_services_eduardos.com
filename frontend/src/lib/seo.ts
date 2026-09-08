export type FaqItem = { question: string; answer: string };

export const SITE_ORIGIN = "https://eduardoos.com";
export const SITE_NAME = "Eduardoos";
export const PERSON_NAME = "Eduardo Osteicoechea";

export const SAME_AS = [
  "https://www.linkedin.com/in/eduardoosteicoechea",
  "https://github.com/EduardoOsteicoechea",
  "https://youtube.com/@EduardoOsteicoechea",
] as const;

export function personSchema() {
  return {
    "@type": "Person",
    "@id": `${SITE_ORIGIN}/#person`,
    name: PERSON_NAME,
    url: SITE_ORIGIN,
    jobTitle: "AEC AI Technologist",
    description:
      "Licensed Building Architect (ULA, Cum Laude) and full-stack desktop–web–cloud developer with focused BIM training. Builds Revit/AutoCAD API tools, AI integrations, and multiplatform products for AEC.",
    sameAs: [...SAME_AS],
    email: "mailto:eduardooost@gmail.com",
  };
}

export function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_ORIGIN}/#website`,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    inLanguage: "en",
    description:
      "Public home for Eduardo Osteicoechea — AEC AI technologist, licensed architect, BIM practitioner, and full-stack developer.",
    publisher: { "@id": `${SITE_ORIGIN}/#person` },
  };
}

export function faqSchema(items: FaqItem[]) {
  return {
    "@type": "FAQPage",
    "@id": `${SITE_ORIGIN}/#faq`,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function graph(...nodes: Record<string, unknown>[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}

export function aboutPageSchema() {
  return {
    "@type": "AboutPage",
    "@id": `${SITE_ORIGIN}/about`,
    url: `${SITE_ORIGIN}/about`,
    name: `About · ${SITE_NAME}`,
    isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
    about: { "@id": `${SITE_ORIGIN}/#person` },
    inLanguage: "en",
  };
}

export function contactPageSchema() {
  return {
    "@type": "ContactPage",
    "@id": `${SITE_ORIGIN}/contact`,
    url: `${SITE_ORIGIN}/contact`,
    name: `Contact · ${SITE_NAME}`,
    isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
    about: { "@id": `${SITE_ORIGIN}/#person` },
    inLanguage: "en",
  };
}

export const HOME_FAQS: FaqItem[] = [
  {
    question: "Who is Eduardo Osteicoechea?",
    answer:
      "Eduardo Osteicoechea is a licensed Building Architect (ULA, Cum Laude) and full-stack developer who builds BIM tools, AI integrations, and production web platforms for AEC.",
  },
  {
    question: "What does Eduardoos publish?",
    answer:
      "Eduardoos.com is the public site for product work, technical writing, and services. It is a static Astro frontend that talks to its own Go API only through same-origin /api/.",
  },
  {
    question: "Does he hold a Master’s degree in BIM?",
    answer:
      "No. He completed focused BIM training (Autodesk Authorized Training Center Course 2011 and a BIMMASTER.org course). That is professional training, not a Master’s degree.",
  },
  {
    question: "How can I contact Eduardo?",
    answer:
      "Use the Contact page or public channels: email eduardooost@gmail.com, WhatsApp https://wa.me/584147281033, LinkedIn, GitHub, or YouTube listed on eduardoos.com.",
  },
];
