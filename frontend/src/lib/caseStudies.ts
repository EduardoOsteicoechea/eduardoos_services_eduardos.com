export type CaseStudy = {
  slug: string;
  title: string;
  summary: string;
  problem: string;
  role: string;
  approach: string;
  architecture: string;
  outcome: string;
  stack: string[];
  links: { label: string; href: string }[];
  icon: string;
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "ereport",
    title: "eReport - AEC issue tracker with API connector",
    summary:
      "Owner-scoped issue reports with images, invites, website registration binding, and a docs-first public API for Cursor connectors.",
    problem:
      "Design and construction teams need structured issue capture that can sit beside BIM delivery - not a generic ticket tool - with safe sharing and automation.",
    role: "Product owner and full-stack engineer (Go API, Astro/TypeScript UI, connector skill).",
    approach:
      "Cookie session workspace for humans; API-key /api/v1/ereport for agents; website registration purpose so a site can lock feedback to one report; image upload with ownership checks.",
    architecture:
      "Astro frontend → same-origin Go API → MongoDB + media root. Public catalog at GET /api/v1/docs. Entitlements gate ereport and ereport-connector.",
    outcome:
      "Live product on eduardoos.com with subscribe path, connector CLI, and embeddable issue flows.",
    stack: ["Go", "MongoDB", "TypeScript", "Astro", "API keys", "CSRF cookie auth"],
    links: [
      { label: "Open eReport", href: "/ereport" },
      { label: "Subscribe", href: "/payments/subscription" },
      { label: "API docs", href: "/api-docs" },
    ],
    icon: "assignment",
  },
  {
    slug: "eoproject",
    title: "eoProject - construction stages, photos, IFC",
    summary:
      "Track construction project stages, site photos, and IFC model versions under one account.",
    problem:
      "Field progress and model versions often live in disconnected folders; teams need a simple cloud surface tied to the same identity as BIM tools.",
    role: "Full-stack engineer (Go API + Astro workspace).",
    approach:
      "Project hub with stage timeline, photo evidence, and IFC version uploads; invite links for collaborators; entitlement-gated API.",
    architecture:
      "Astro UI → Go /api/eoproject → Mongo + media. Complements eReport for delivery/feedback loops.",
    outcome:
      "Public subscribe + app surface for construction tracking next to BIM software work.",
    stack: ["Go", "MongoDB", "TypeScript", "IFC", "media storage"],
    links: [
      { label: "Open eoProject", href: "/eoproject" },
      { label: "Subscribe", href: "/payments/subscription" },
    ],
    icon: "foundation",
  },
  {
    slug: "deepdeepbim",
    title: "DeepDeepBim - Revit add-in auto-update on AWS",
    summary:
      "ASP.NET Core APIs distribute Revit add-in DLLs from S3, authenticate users with DynamoDB, and serve a static frontend on CloudFront.",
    problem:
      "Desktop Revit add-ins need reliable update delivery without manual MSI handouts across machines and versions.",
    role: "Architect of the distribution platform (personal project).",
    approach:
      "GitHub Actions builds .NET 8 add-in and syncs DLL/JSON to S3; update API on EC2 streams a zip after key validation; auth API uses DynamoDB + JWT; frontend on S3 + CloudFront with cache invalidation.",
    architecture:
      "Revit add-in → HTTPS update API (EC2) → S3 artifacts. Auth API → DynamoDB. CI: aws s3 sync + CloudFront invalidation.",
    outcome:
      "End-to-end cloud add-in distribution demonstrating ASP.NET Core + AWS skills required by senior BIM software roles.",
    stack: ["C#", "ASP.NET Core", ".NET 8/9", "S3", "EC2", "DynamoDB", "CloudFront", "GitHub Actions"],
    links: [
      { label: "GitHub (update API)", href: "https://github.com/EduardoOsteicoechea/DeepDeepBim.RevitApiAddinUpdateApi" },
      { label: "GitHub (auth API)", href: "https://github.com/EduardoOsteicoechea/deepdeepbimapi_20260131_ssr" },
    ],
    icon: "cloud_upload",
  },
  {
    slug: "revit-model-validation",
    title: "Revit model validation tooling",
    summary:
      "C#/.NET algorithms for element queries and geometry checks on large Revit models inside an existing production add-in.",
    problem:
      "Large models need automated QA that surfaces issues early without freezing the UI or scanning the whole database naively.",
    role: "BIM Full Stack Developer at Hexagon Multivista (Voyansi).",
    approach:
      "Extend an existing add-in: FilteredElementCollector patterns, efficient geometry checks, troubleshoot and document for the team. Client NDA: no proprietary names or screenshots.",
    architecture:
      "Revit API add-in (C#/.NET) coexisting with team-owned modules; shared patterns for validation passes.",
    outcome:
      "Validation tools that ship inside a maintained enterprise add-in; stronger attention to performance and maintainability.",
    stack: ["C#", ".NET", "Revit API", "WPF"],
    links: [{ label: "Profile", href: "/" }],
    icon: "fact_check",
  },
  {
    slug: "ai-revit-rendering",
    title: "AI rendering from Revit views",
    summary:
      "Capture model views via the Revit API and generate rendered proposal options with local FLUX/ControlNet pipelines and PowerShell installers.",
    problem:
      "Early architectural proposals need fast visual options without a full rendering department cycle.",
    role: "Author of Revit capture + AI restyle tooling.",
    approach:
      "Revit API captures view context; Python/FLUX ControlNet restyles; PowerShell install.ps1 sets up CUDA/venv for local GPU runs.",
    architecture:
      "Revit add-in → image context → local GPU pipeline (FLUX + ControlNet) → proposal gallery.",
    outcome:
      "Rapid proposal imagery loop tied to live BIM geometry.",
    stack: ["C#", "Revit API", "Python", "PowerShell", "FLUX", "ControlNet"],
    links: [{ label: "GitHub profile", href: "https://github.com/EduardoOsteicoechea" }],
    icon: "image",
  },
  {
    slug: "aps-acc-dashboards",
    title: "APS Design Automation & ACC dashboards",
    summary:
      "Extract, manage, and report data from model sets into web dashboards; run automated analysis on models via Autodesk cloud.",
    problem:
      "ACC model sets hold valuable data that is hard to operationalize without Design Automation and reporting surfaces.",
    role: "BIM software developer (Hexagon role + personal cloud work).",
    approach:
      "APS Design Automation jobs extract structured data; ACC APIs feed dashboards; analysis results surface in web UI.",
    architecture:
      "ACC / APS → Design Automation → data store → web dashboard (REST).",
    outcome:
      "Repeatable cloud BIM data pipelines complementing desktop Revit add-ins.",
    stack: ["Autodesk APS", "ACC", "C#", "REST", "dashboards"],
    links: [{ label: "Profile", href: "/" }],
    icon: "hub",
  },
  {
    slug: "eduardoos-platform",
    title: "eduardoos.com - path-scoped CI and secure APIs",
    summary:
      "Go REST API with documented catalog, cookie + API-key auth, MongoDB, Astro frontend, Nginx, and GitHub Actions that deploy only changed scopes.",
    problem:
      "A personal platform must stay secure, observable, and cheap to deploy without restarting unused services on every push.",
    role: "Sole architect and operator.",
    approach:
      "Deny-by-default entitlements, CSRF, request IDs, mustLog diagnostics, path-scoped deploy for frontend vs API vs apps.",
    architecture:
      "Astro static → Nginx → loopback Go API → Mongo/media. CI: VPS_HOST secrets, rsync html/, API release + health check.",
    outcome:
      "Production multi-product host that also demonstrates senior engineering hygiene.",
    stack: ["Go", "Astro", "TypeScript", "MongoDB", "Nginx", "GitHub Actions", "Linux"],
    links: [
      { label: "API docs", href: "/api-docs" },
      { label: "GitHub", href: "https://github.com/EduardoOsteicoechea" },
    ],
    icon: "dns",
  },
];

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return caseStudies.find((c) => c.slug === slug);
}
