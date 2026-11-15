import Image from "next/image";

export function Brand({ size = 36 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-3">
      <Image src="/logo.png" alt="" width={size} height={size} priority className="rounded-[22%]" />
      <span className="font-display font-medium tracking-[0.3em]" style={{ fontSize: size * 0.5 }}>AETHR</span>
    </span>
  );
}
