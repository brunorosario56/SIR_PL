import { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { Button, Pill } from "./ui";

export type NavKey = "dashboard" | "schedule" | "groups" | "colegas";

type Props = {
	active: NavKey;
	onChange: (key: NavKey) => void;
	children: ReactNode;
};

const navItems: { key: NavKey; label: string }[] = [
	{ key: "dashboard", label: "Dashboard" },
	{ key: "schedule", label: "Horário" },
	{ key: "groups", label: "Grupos" },
	{ key: "colegas", label: "Colegas" },
];

export default function AppShell({ active, onChange, children }: Props) {
	const { user, logout } = useAuth();

	return (
		<div className="min-h-screen bg-black text-white">
			<header className="border-b border-white/10 bg-black/60 backdrop-blur">
				<div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						<div className="text-lg font-semibold">Classmate Sync</div>
						{user && <Pill>{user.email}</Pill>}
					</div>

					<div className="flex items-center gap-2">
						{navItems.map((item) => (
							<button
								key={item.key}
								onClick={() => onChange(item.key)}
								className={`rounded-xl px-3 py-2 text-sm transition border ${
									active === item.key
										? "border-white bg-white text-black"
										: "border-white/10 text-white hover:bg-white/10"
								}`}
							>
								{item.label}
							</button>
						))}

						<Button variant="ghost" onClick={logout}>
							Sair
						</Button>
					</div>
				</div>
			</header>

			<main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
		</div>
	);
}
