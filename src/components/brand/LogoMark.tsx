import Image from "next/image";

/** The JobFitwise puzzle mark. Decorative: the name always sits next to it. */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return <Image src="/logo-mark.png" alt="" width={size} height={size} priority className={`shrink-0 ${className}`} />;
}
