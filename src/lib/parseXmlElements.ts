/** Parse an XML string's descendant elements with a given tag name into plain attribute maps.
 *  Browser-only (DOMParser) -- returns [] during SSR / if content is empty, since every consumer
 *  refetches client-side after hydration anyway (auth-gated queries never run on the server). */
export function parseXmlElements(xml: string | undefined, tag: string): Record<string, string>[] {
  if (!xml || typeof window === "undefined" || typeof DOMParser === "undefined") return [];
  try {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    if (doc.querySelector("parsererror")) return [];
    return Array.from(doc.getElementsByTagName(tag)).map((el) => {
      const attrs: Record<string, string> = {};
      for (const attr of Array.from(el.attributes)) attrs[attr.name] = attr.value;
      return attrs;
    });
  } catch {
    return [];
  }
}
