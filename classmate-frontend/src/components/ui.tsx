import React from "react";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 ${className}`}>
      {children}
    </div>
  );
}

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const base = "rounded-xl px-4 py-2 text-sm font-medium transition active:scale-[0.99] disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-white text-black hover:bg-white/90"
      : variant === "danger"
      ? "bg-red-500 text-white hover:bg-red-400"
      : "bg-white/0 text-white hover:bg-white/10 border border-white/10";
  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30 ${className}`}
      {...props}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-white/60 mb-1">{children}</div>;
}

export function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs ${className}`}>
      {children}
    </span>
  );
}
