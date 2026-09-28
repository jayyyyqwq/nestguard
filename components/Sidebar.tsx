"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ArrowLeft } from "lucide-react";

const navItems = [{ href: "/enclosure", label: "Dashboard", icon: LayoutGrid }];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 bg-ink text-white flex flex-col min-h-screen">
      <div className="px-6 pt-7 pb-6">
        <Link href="/" className="flex items-center gap-2 text-white/60 text-xs mb-6 hover:text-white transition-colors">
          <ArrowLeft size={14} />
          Back to NestGuard
        </Link>
        <div className="font-display text-2xl">NestGuard</div>
        <div className="text-gold text-xs mt-1">Enclosure monitoring</div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active ? "bg-white/10 text-gold" : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
