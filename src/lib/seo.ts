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
