/** Apply favicon / apple-touch-icon link tags in the document head. */
export function applyFavicon(url: string) {
  if (!url || typeof document === "undefined") return;

  const href = url;
  const ensureLink = (rel: string, type?: string) => {
    let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement("link");
      link.rel = rel;
      document.head.appendChild(link);
    }
    if (type) link.type = type;
    link.href = href;
  };

  ensureLink("icon");
  ensureLink("shortcut icon");
  ensureLink("apple-touch-icon");
}
