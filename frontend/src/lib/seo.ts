export type FaqItem = { question: string; answer: string };

export const SITE_ORIGIN = "https://eduardoos.com";
export const SITE_NAME = "Eduardoos";
export const PERSON_NAME = "Eduardo Osteicoechea";

export const SAME_AS = [
  "https://www.linkedin.com/in/eduardoosteicoechea",
  "https://github.com/EduardoOsteicoechea",
  "https://www.youtube.com/@eduardoosvideos",
] as const;

export function personSchema() {
  return {
    "@type": "Person",
    "@id": `${SITE_ORIGIN}/#person`,
    name: PERSON_NAME,
    url: SITE_ORIGIN,
    jobTitle: "Senior BIM Software Developer",
    description:
      "Licensed Building Architect (ULA, Cum Laude) and Senior BIM Software Developer. Revit/AutoCAD APIs, C#/.NET add-ins, Autodesk APS/ACC, ASP.NET Core, and AWS cloud architectures.",
    knowsAbout: [
      "Revit API",
      "AutoCAD API",
      "Autodesk Platform Services",
      "Autodesk Construction Cloud",
      "C#",
      ".NET",
      "ASP.NET Core",
      "AWS",
      "Dynamo",
      "Python",
      "BIM",
    ],
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
      "Professional profile for Eduardo Osteicoechea - Senior BIM Software Developer, licensed architect, Revit/AutoCAD API and APS engineer.",
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
      "Eduardo Osteicoechea is a licensed Building Architect (ULA, Cum Laude) and Senior BIM Software Developer. He builds Revit/AutoCAD API add-ins, APS/ACC automations, ASP.NET Core APIs on AWS, and AEC tools such as eReport and eoProject.",
  },
  {
    question: "What is public on eduardoos.com?",
    answer:
      "His professional profile, portfolio case studies, CV, contact, eReport, eoProject, eApi/API docs, and subscriptions for those public products. Other platform tools are private.",
  },
  {
    question: "Does he hold a Master’s degree in BIM?",
    answer:
      "No. He completed focused BIM training (Autodesk Authorized Training Center Course 2011 and a BIMMASTER.org course). That is professional training, not a Master’s degree.",
  },
  {
    question: "How can I contact Eduardo?",
    answer:
      "Use the Contact page or public channels: email eduardooost@gmail.com, WhatsApp https://wa.me/584147281033, LinkedIn, GitHub, or YouTube listed on eduardoos.com. He works remotely.",
  },
];
