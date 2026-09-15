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
  return serializeXmlChildren(records, tag, tag);
}

/** Same as serializeXmlElements, but for files whose root and child tags differ (e.g.
 *  paints.xml: `<n id='getpaints'><p l='..' c='..'/>...</n>` -- root "n", children "p"). The
 *  root's own attributes (if any) aren't preserved here since none of this app's editors touch
 *  them; pass rootAttrs to keep them if that ever changes. */
export function serializeXmlChildren(
  records: Record<string, string>[],
  rootTag: string,
  childTag: string,
  rootAttrs: Record<string, string> = {},
): string {
  const children = records
    .map((rec) => {
      const attrs = Object.entries(rec)
        .map(([k, v]) => `${k}='${escapeXmlAttr(v)}'`)
        .join(" ");
      return `<${childTag} ${attrs}/>`;
    })
    .join("");
  const rootAttrStr = Object.entries(rootAttrs)
    .map(([k, v]) => ` ${k}='${escapeXmlAttr(v)}'`)
    .join("");
  return `<${rootTag}${rootAttrStr}>${children}</${rootTag}>`;
}

/** Patch one element's attributes in place and reserialize the WHOLE document, preserving
 *  everything serializeXmlElements can't: nested children (e.g. showroom-100.xml's <c> car
 *  entries each carry a <p cd='..'/> list of paint-color options), other sibling elements,
 *  attribute ordering on untouched elements, etc. Use this instead of
 *  parseXmlElements+serializeXmlElements whenever the records being edited have child content --
 *  the flat serializer would silently drop it.
 *
 *  `idAttr`/`idValue` identify the one element to patch (e.g. idAttr="i", idValue="28" for a
 *  showroom car). Only the FIRST matching element is patched. Returns the original xml unchanged
 *  if no element matches or on a parse error, so a caller can detect a no-op by comparing output
 *  to input. */
export function updateXmlElementAttrs(
  xml: string,
  tag: string,
  idAttr: string,
  idValue: string,
  nextAttrs: Record<string, string>,
): string {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return xml;
  try {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    if (doc.querySelector("parsererror")) return xml;
    const target = Array.from(doc.getElementsByTagName(tag)).find(
      (el) => el.getAttribute(idAttr) === idValue,
    );
    if (!target) return xml;
    for (const [k, v] of Object.entries(nextAttrs)) target.setAttribute(k, v);
    return new XMLSerializer().serializeToString(doc);
  } catch {
    return xml;
  }
}
