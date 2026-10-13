import TopBar from "@/components/TopBar";

// Always backed by a live API call, never statically prerendered at build time.
export const dynamic = "force-dynamic";

export default function EnclosureLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-6xl px-4 sm:px-8 pt-10 pb-20">{children}</main>
    </>
  );
}
