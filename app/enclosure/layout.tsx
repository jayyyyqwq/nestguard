import Sidebar from "@/components/Sidebar";

// Always backed by a live API call — never statically prerendered at build time.
export const dynamic = "force-dynamic";

export default function EnclosureLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 bg-paper min-h-screen">{children}</main>
    </div>
  );
}
