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

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Serialize plain attribute maps back into a flat `<tag a='1' b='2'/>` element list, wrapped in
 *  a single root of the same tag name -- the exact shape catalog files like wheels-500.xml use
 *  (`<p><p i='1' .../><p i='2' .../></p>`). Round-trips whatever attribute keys each record
 *  happens to carry, in the order Object.entries gives them (insertion order, which
 *  parseXmlElements preserves from the source attributes) -- no schema assumed beyond
 *  "flat string attributes on one repeated element". */
export function serializeXmlElements(records: Record<string, string>[], tag: string): string {
  const children = records
    .map((rec) => {
      const attrs = Object.entries(rec)
        .map(([k, v]) => `${k}='${escapeXmlAttr(v)}'`)
        .join(" ");
      return `<${tag} ${attrs}/>`;
    })
    .join("");
  return `<${tag}>${children}</${tag}>`;
}
