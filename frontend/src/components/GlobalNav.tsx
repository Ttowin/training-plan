import { NavLink } from "react-router-dom";

const NAV = [
  { to: "/", label: "HOME", icon: "⌂" },
  { to: "/history", label: "LOG", icon: "≡" },
  { to: "/progress", label: "DATA", icon: "▦" },
  { to: "/proposals", label: "PROTO", icon: "✦" },
];

export function GlobalNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-matrix-bg border-t border-matrix-border safe-area-bottom">
      <div className="flex">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-3 gap-0.5 font-terminal text-xs uppercase tracking-widest transition-colors
               ${isActive ? "text-matrix-green" : "text-matrix-text-muted hover:text-matrix-green"}`
            }
          >
            <span className="text-lg leading-none">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
