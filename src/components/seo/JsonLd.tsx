import { isValidElement, type ReactNode } from "react";

/** Structured data for search engines. `<` is escaped so text can never close the script tag. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** Plain text of a JSX answer (links and bold kept as their words), for FAQ structured data. */
export function plainText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(plainText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    const inner = plainText(node.props.children);
    // Separate paragraphs with a space so sentences don't run together.
    return node.type === "p" ? `${inner} ` : inner;
  }
  return "";
}

/** Public address of the site, for absolute URLs in structured data. */
export const siteUrl = () => (process.env.APP_URL?.trim().replace(/\/+$/, "") || "https://bon997-fitwise.vercel.app");
