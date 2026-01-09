import type { ReactNode } from "react";

/**
 * Todas as views possíveis da app
 */
export type NavKey =
  | "dashboard"
  | "schedule"
  | "groups"
  | "colegas";

/**
 * Props do AppShell
 */
type AppShellProps = {
  active: NavKey;
  onChange: (key: NavKey) => void;
  onLogout?: () => void;
  children: ReactNode;
};


export default function AppShell({
  active,
  onChange,
  onLogout,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-neutral-950 text-white">
      {/* Sidebar */}
      <aside className="w-56 border-r border-white/10 p-4">
        <div className="text-lg font-semibold mb-4">Classmate</div>

        <nav className="space-y-1">
          <NavItem label="Dashboard" active={active === "dashboard"} onClick={() => onChange("dashboard")} />
          <NavItem label="Horário" active={active === "schedule"} onClick={() => onChange("schedule")} />
          <NavItem label="Grupos" active={active === "groups"} onClick={() => onChange("groups")} />
          <NavItem label="Colegas" active={active === "colegas"} onClick={() => onChange("colegas")} />
        </nav>

        {onLogout && (
          <div className="mt-6">
            <button
              onClick={onLogout}
              className="w-full rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition"
            >
              Terminar sessão
            </button>
          </div>
        )}
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

/**
 * Item da sidebar
 */
function NavItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full text-left px-3 py-2 rounded-lg transition",
        active
          ? "bg-indigo-500/20 text-indigo-200"
          : "hover:bg-white/10 text-white/80",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
