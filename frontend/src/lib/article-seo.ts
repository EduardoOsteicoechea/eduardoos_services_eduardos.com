export type ArticleSeoInput = {
  title: string;
  description: string;
  url: string;
  siteName: string;
  language?: string;
  author?: string;
  articleBody?: string;
  datePublished?: string;
  dateModified?: string;
};

function setMeta(attr: "name" | "property", key: string, value: string): void {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

export function applyArticleSeo(input: ArticleSeoInput): void {
  const title = input.title.trim() || "Article";
  const description = (input.description || title).trim().slice(0, 160);
  document.title = `${title} · ${input.siteName}`;
  setMeta("name", "description", description);
  setMeta("name", "robots", "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
  setMeta("property", "og:type", "article");
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", description);
  setMeta("property", "og:url", input.url);
  setMeta("property", "og:site_name", input.siteName);
  if (input.language) setMeta("property", "og:locale", input.language);
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", title);
  setMeta("name", "twitter:description", description);

  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = input.url;

  document.getElementById("article-json-ld")?.remove();
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = "article-json-ld";
  const authorName = (input.author || "").trim();
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
    isAccessibleForFree: true,
    inLanguage: (input.language || "es").replace("_", "-"),
    publisher: { "@type": "Organization", name: input.siteName, url: new URL(input.url).origin },
  };
  if (authorName) data.author = { "@type": "Person", name: authorName };
  if (input.datePublished) data.datePublished = input.datePublished;
  if (input.dateModified) data.dateModified = input.dateModified;
  if (input.articleBody) data.articleBody = input.articleBody.slice(0, 5000);
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}
