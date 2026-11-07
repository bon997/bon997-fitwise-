import Image from "next/image";

/** Width ÷ height of public/logo-mark.png (the JW mark is wider than it is tall). */
const RATIO = 278 / 192;

/** The JobFitwise JW mark. Decorative: the name always sits next to it. `size` is its height. */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return <Image src="/logo-mark.png" alt="" width={Math.round(size * RATIO)} height={size} priority className={`shrink-0 ${className}`} />;
}
