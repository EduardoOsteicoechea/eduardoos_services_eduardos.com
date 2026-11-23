/**
 * Public marketing profile facts for the home dossier + JSON-LD.
 * Keep aligned with backend/internal/contact/PROFILE_CONTEXT.md §2 (no invention).
 * Visible dossier copy is first person; FAQ questions stay natural-language for AEO.
 * Privacy: do not volunteer birth date; residence only as Venezuela if needed.
 */

export const PROFILE_LINKEDIN = "https://www.linkedin.com/in/eduardoosteicoechea";
export const PROFILE_EMAIL = "eduardooost@gmail.com";
export const PROFILE_WHATSAPP = "https://wa.me/584147281033";
export const PROFILE_WHATSAPP_DISPLAY = "+58 414 728 1033";
export const PROFILE_SITE = "https://eduardoos.com";
export const PROFILE_YOUTUBE = "https://www.youtube.com/@eduardoosvideos";
export const PROFILE_GITHUB = "https://github.com/EduardoOsteicoechea";

export const profileWhoAnswer =
  "I am a licensed Building Architect and BIM Software Developer. I build and maintain C#/.NET add-ins for Revit and AutoCAD, cloud automations on Autodesk Platform Services and Autodesk Construction Cloud, ASP.NET Core APIs on AWS, and Python/Dynamo scripts that remove repetitive work from design teams.";

/** Second hero paragraph (home page lead). */
export const profileWhoLead2 =
  "This site is my professional profile: case studies, CV, and two public AEC tools - eReport (issue tracking) and eoProject (construction stages, photos, and IFC versions). Fluent English, native Spanish. Remote.";

export const HOME_HEADING = "BIM Software Developer";

export type HomeServiceOffer = {
  id: string;
  label: string;
  shortName: string;
  description: string;
  focus: string;
  href: string;
  icon: string;
  /** Public path under /homepage_services_screenshots when available. */
  screenshot?: string;
};

/** Public product surfaces shown on the home / portfolio (profile-mode). */
export const homeServiceOffers: HomeServiceOffer[] = [
  {
    id: "ereport",
    label: "eReport",
    shortName: "eReport",
    description: "Issue tracker with cloud storage, sharing, and an API-key connector.",
    focus: "Capture AEC issues, statuses, images, and shared invites - a complement to BIM delivery workflows.",
    href: "/portfolio/ereport",
    icon: "assignment",
    screenshot: "/homepage_services_screenshots/ereport.png",
  },
  {
    id: "eoproject",
    label: "eoProject",
    shortName: "eoProject",
    description: "Construction project stages, photos, and IFC versions.",
    focus: "Track build progress, site photos, and model versions alongside BIM software work.",
    href: "/portfolio/eoproject",
    icon: "foundation",
    screenshot: "/homepage_services_screenshots/ebuild.png",
  },
  {
    id: "api",
    label: "eApi",
    shortName: "eApi",
    description: "API keys for external apps and Cursor connectors.",
    focus: "Automate eReport and related product routes with documented /api/v1 endpoints.",
    href: "/api-docs",
    icon: "key",
  },
];

export const homeServicesFocus =
  "Public tools on this profile: eReport for issue tracking, eoProject for construction progress and IFC versions, and eApi for keyed automation. Subscribe to unlock what you need; everything else on this platform stays private.";

export const profileExpertiseAnswer =
  "I specialize in Revit and AutoCAD API tooling, custom add-ins (WPF/Windows Forms), Dynamo Zero Touch and Python, Autodesk APS Design Automation and ACC data extraction, ASP.NET Core APIs, and AWS cloud architectures (EC2, S3, CloudFront, DynamoDB, Lambda, SQS, ECR).";

export type ProfileExperience = {
  org: string;
  role: string;
  period: string;
  summary: string;
  /** Material Symbol ligature for the job card. */
  icon: string;
};

export const profileExperience: ProfileExperience[] = [
  {
    org: "Hexagon Multivista (formerly Voyansi)",
    role: "BIM Full Stack Developer (.NET & AI)",
    period: "2025-present",
    icon: "apartment",
    summary:
      "Revit model-validation tools inside a large C#/.NET add-in; APS Design Automation and ACC data dashboards; AI rendering from the Revit API; Python geometry scripts; agentic AI development workflows; full-stack internal tools.",
  },
  {
    org: "Avant Leap",
    role: "BIM software developer",
    period: "March 2024-April 2025",
    icon: "precision_manufacturing",
    summary:
      "I support and extend Revit add-ins (Clash Detection, Object Visualizer, Object Quantifier, 4D Simulation, Dynamo Zero Touch Nodes, Mirar, Andiamo, Itera). I built SincronizadorGPS50 (Windows Forms + SQL Server) linking Gestproject2024 and Sage50, and implement agentic workflows that connect Windows apps and Revit APIs to model-driven automation.",
  },
  {
    org: "Freelance",
    role: "Full-stack web & UI/UX",
    period: "Late 2023 (~six months)",
    icon: "language",
    summary:
      "I delivered sites including scalaa.com, theinspiratagroup.com, hotelbelensate.com, eduardoos.com, crintt.com, and thedalessiogroup.com - branding, design, coding, hosting, email migration, and media production.",
  },
  {
    org: "BIMIQs (Miami)",
    role: "BIM modeler, Revit API developer, web developer",
    period: "2023",
    icon: "apartment",
    summary:
      "As the first employee of a US AEC consulting startup, I covered BIM modeling, Revit families, Revit API tools (including Revit Modeler), and graphic design for bimiqs.com - modeling, research, API, and full-stack web in one role.",
  },
  {
    org: "VDC Works (Miami)",
    role: "Revit BIM technician",
    period: "2023",
    icon: "engineering",
    summary:
      "I documented electrical rooms and assemblies with collaborative BIM workflows and began visual programming with Revit Dynamo and Python.",
  },
  {
    org: "Galpon5",
    role: "Architectural project assistant",
    period: "2017-2018",
    icon: "architecture",
    summary:
      "I modeled, documented, and rendered buildings in AutoCAD, SketchUp, V-Ray, and 3ds Max for hospitality and commercial projects including Lindo Sol Suites Hotel and Lindo Bakery.",
  },
];

export const profileLeadership = {
  org: "Iglesia Palabra Viva",
  role: "Leadership & teaching",
  period: "Until ~2023",
  summary:
    "Public speaking, counseling, and teaching; parallel theology study at Integridad & Sabiduría.",
};

export type ProfileEducationCard = {
  title: string;
  description: string;
  /** Material Symbol ligature. */
  icon: string;
};

/** Education items as icon-on-top cards (2-up grid on home). */
export const profileEducation: ProfileEducationCard[] = [
  {
    title: "Bachelor of Architecture",
    icon: "school",
    description:
      "Universidad de Los Andes (ULA), 2009-2017; graduated 2017 (Cum Laude). Architectural design, AutoCAD, SketchUp; BIM training at an Autodesk Authorized Training Center.",
  },
  {
    title: "Autodesk ATC Course",
    icon: "verified",
    description:
      "Autodesk Authorized Training Center Course (2011) - BIM-related training (not a conferred Master’s degree).",
  },
  {
    title: "Advanced BIM Modeling",
    icon: "view_in_ar",
    description: "Advanced BIM Modeling Course, BIMMASTER.org.",
  },
  {
    title: "Theology studies",
    icon: "menu_book",
    description:
      "Integridad & Sabiduría (online institute, Dominican Republic), through ~2023.",
  },
  {
    title: "Full-stack web development",
    icon: "code",
    description:
      "Self-study (2020-2023): HTML, CSS, JavaScript, Bootstrap, PHP, MySQL, and modern front-end practice.",
  },
];

export type ProfileSkill = {
  title: string;
  description: string;
  /** Material Symbol ligature for the skill card. */
  icon: string;
};

/** Six featured skills for the home skills grid (brief, CV-grounded). */
export const profileSkillCards: ProfileSkill[] = [
  {
    title: "Autodesk APIs",
    icon: "extension",
    description:
      "Revit API, AutoCAD API, APS Design Automation, ACC data extraction, Dynamo nodes and Python.",
  },
  {
    title: "Add-in engineering",
    icon: "build",
    description:
      "Multi-version C#/.NET add-ins, WPF MVVM, installers, S3 auto-update, troubleshooting large models.",
  },
  {
    title: "Microsoft stack",
    icon: "desktop_windows",
    description:
      "C#, .NET Framework 4.8, .NET 8/9, ASP.NET Core minimal APIs, WPF, Windows Forms, SQL Server, Visual Studio.",
  },
  {
    title: "AWS cloud architecture",
    icon: "cloud",
    description:
      "EC2, S3, CloudFront, Route 53, DynamoDB, Lambda, SQS, ECR; Linux, systemd, Docker, Nginx, TLS.",
  },
  {
    title: "Agentic workflows",
    icon: "psychology",
    description:
      "I design and implement agentic workflows that orchestrate tools, APIs, and BIM context for AI-assisted delivery.",
  },
  {
    title: "AEC domain",
    icon: "domain",
    description:
      "Licensed architect; BIM modeling and documentation; model validation / QA; coordination workflows.",
  },
];

export const profileSkills: string[] = profileSkillCards.map((s) => s.title);

export const profileStack =
  "C#, .NET Framework 4.8, .NET 8/9, ASP.NET Core, WPF, Windows Forms, Revit API, AutoCAD API, Autodesk APS/ACC, Dynamo, Python, PowerShell (basic), SQL Server, MySQL, MongoDB, TypeScript, React, Go REST APIs, AWS (EC2, S3, CloudFront, Route 53, DynamoDB, Lambda, SQS, ECR), Linux, Nginx, Docker, GitHub Actions, agentic workflows.";

export const profileFocusAnswer =
  "At Hexagon Multivista I build Revit API tools, APS/ACC automations, and AI-assisted BIM workflows. Independently I ship documented APIs, cloud add-in distribution, and AEC web tools (eReport, eoProject) that complement senior BIM software delivery.";

export type ProfileFaq = {
  question: string;
  /** Plain-text answer for JSON-LD / AEO. */
  answer: string;
  icon: string;
  /** When set, home UI renders these as real links (JSON-LD still uses `answer`). */
  answerLinks?: { label: string; href: string }[];
};

export const profileFaq: ProfileFaq[] = [
  {
    question: "Who is Eduardo Osteicoechea?",
    icon: "person",
    answer: profileWhoAnswer,
  },
  {
    question: "What is Eduardo OS?",
    icon: "dns",
    answer:
      "Eduardo OS is my professional platform at eduardoos.com - services and tools spanning pamphlet documents, articles, music, church, and homescool, alongside my practice in BIM and full-stack software with a strong focus on AI-driven development.",
  },
  {
    question: "How can I contact Eduardo Osteicoechea?",
    icon: "mail",
    answer:
      "Email eduardooost@gmail.com, WhatsApp +58 414 728 1033 (https://wa.me/584147281033), or LinkedIn https://www.linkedin.com/in/eduardoosteicoechea. GitHub and YouTube profiles are also public on this site.",
    answerLinks: [
      { label: "Email", href: `mailto:${PROFILE_EMAIL}` },
      { label: "WhatsApp", href: PROFILE_WHATSAPP },
      { label: "LinkedIn", href: PROFILE_LINKEDIN },
    ],
  },
  {
    question: "Where does Eduardo Osteicoechea live?",
    icon: "location_on",
    answer:
      "I currently reside in Venezuela. For further information, contact me by email, WhatsApp, or LinkedIn using the public channels listed on this page.",
  },
];

/** JSON-LD @graph for the home page (Person + WebPage + FAQPage). */
export function buildHomeProfileJsonLd(pageUrl: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: `Eduardo Osteicoechea - ${HOME_HEADING}`,
        description: profileWhoAnswer,
        isPartOf: { "@id": `${PROFILE_SITE}/#website` },
        about: { "@id": `${pageUrl}#person` },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${PROFILE_SITE}/personal_photo_1080x1920_side_placed.webp`,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${PROFILE_SITE}/#website`,
        url: PROFILE_SITE,
        name: "Eduardo OS",
        publisher: { "@id": `${pageUrl}#person` },
      },
      {
        "@type": "Person",
        "@id": `${pageUrl}#person`,
        name: "Eduardo Osteicoechea",
        url: PROFILE_SITE,
        image: `${PROFILE_SITE}/personal_photo_1080x1920_side_placed.webp`,
        jobTitle: HOME_HEADING,
        description: profileWhoAnswer,
        email: PROFILE_EMAIL,
        sameAs: [PROFILE_LINKEDIN, PROFILE_GITHUB, PROFILE_YOUTUBE, PROFILE_SITE],
        knowsAbout: [
          "Building Information Modeling",
          "Revit API",
          "Architecture",
          "Full-stack software development",
          "Agentic workflows",
          "AI-assisted BIM development",
        ],
        alumniOf: {
          "@type": "CollegeOrUniversity",
          name: "Universidad de Los Andes",
        },
        worksFor: {
          "@type": "Organization",
          name: "Hexagon Multivista",
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        mainEntity: profileFaq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
    ],
  };
}
