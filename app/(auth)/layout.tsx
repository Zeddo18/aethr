import { Brand } from "@/components/brand";
import { OrbitLine } from "@/components/orbit-line";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10"
      style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))", paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}>
      <Brand size={56} />
      <OrbitLine className="mb-8 mt-5 h-6 w-full" />
      {children}
    </main>
  );
}
