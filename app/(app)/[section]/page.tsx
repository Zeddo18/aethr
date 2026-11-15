import { notFound } from "next/navigation";

const SECTIONS: Record<string, string> = { nutrition: "Food", gym: "Gym", run: "Run" };

export default async function Placeholder({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const title = SECTIONS[section];
  if (!title) notFound();
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted">This section isn&apos;t built yet.</p>
    </>
  );
}
