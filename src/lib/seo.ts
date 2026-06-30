interface SeoMeta {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
}

export function setSeoMeta(meta: SeoMeta): void {
  if (meta.title) document.title = meta.title;

  const setMeta = (property: string, content: string, attr: "name" | "property" = "property") => {
    let el = document.querySelector(`meta[${attr}="${property}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, property);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };

  if (meta.description) setMeta("description", meta.description, "name");
  if (meta.ogTitle) setMeta("og:title", meta.ogTitle);
  if (meta.ogDescription) setMeta("og:description", meta.ogDescription);
  if (meta.ogImage) setMeta("og:image", meta.ogImage);
  if (meta.ogUrl) setMeta("og:url", meta.ogUrl);
}

const SITE_ORIGIN = "https://long-pay.vercel.app";

/**
 * Inject one or more JSON-LD blocks into <head>. Returns a cleanup function
 * that removes the injected scripts, suitable for useEffect return values.
 */
export function injectJsonLd(blocks: Array<{ id: string; data: unknown }>): () => void {
  const scripts = blocks.map(({ id, data }) => {
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = id;
    script.text = JSON.stringify(data);
    document.head.appendChild(script);
    return script;
  });
  return () => scripts.forEach((s) => s.remove());
}

/**
 * Build a BreadcrumbList JSON-LD object for a single sub-page rooted at Home.
 */
export function buildBreadcrumbSchema(pageName: string, path: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
      { "@type": "ListItem", position: 2, name: pageName, item: `${SITE_ORIGIN}${path}` },
    ],
  };
}
