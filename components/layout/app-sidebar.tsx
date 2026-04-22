"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projetos", label: "Projetos" },
  { href: "/clientes", label: "Clientes" },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function sair() {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-white/10 bg-ili-preto text-white">
      <div className="border-b border-white/10 px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-ili-rosa-500 to-ili-rosa-700" />
          <span className="font-semibold tracking-tight">ili</span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {links.map(({ href, label }) => {
          const ativo =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href + "/"));
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                ativo
                  ? "bg-ili-rosa-600 text-white"
                  : "text-ili-cinza-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={sair}
          className="w-full rounded-lg border border-white/20 px-3 py-2 text-sm text-ili-cinza-200 transition hover:border-ili-rosa-400/60 hover:text-white"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
