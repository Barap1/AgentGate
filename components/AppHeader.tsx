import Link from "next/link";
import { AuthStatus } from "@/components/AuthStatus";

type AppHeaderProps = {
  active?: "home" | "action-guard" | "sources" | "runs" | "docs" | "login";
};

const navItems = [
  { href: "/", label: "Home", active: "home", mark: "01" },
  { href: "/action-guard", label: "Actions", active: "action-guard", mark: "02" },
  { href: "/sources", label: "Sources", active: "sources", mark: "03" },
  { href: "/runs", label: "Runs", active: "runs", mark: "04" },
  { href: "/docs", label: "API Docs", active: "docs", mark: "05" }
] as const;

export function AppHeader({ active = "home" }: AppHeaderProps) {
  return (
    <header className="app-header">
      <Link className="brand" href="/" aria-label="AgentGate scanner">
        <span className="brand-mark" aria-hidden="true">
          AG
        </span>
        <span>
          <strong>AgentGate</strong>
          <small>Untrusted input guardrail for AI agents</small>
        </span>
      </Link>
      <nav className="nav-links" aria-label="Primary navigation">
        {navItems.map((item) => {
          const isActive = active === item.active;

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={isActive ? "nav-link active" : "nav-link"}
              href={item.href}
              key={item.href}
            >
              <span className="nav-mark" aria-hidden="true">{item.mark}</span>
              {item.label}
            </Link>
          );
        })}
        <a
          className="nav-link"
          href="https://github.com/Barap1/AgentGate"
          rel="noreferrer"
          target="_blank"
        >
          <span className="nav-mark" aria-hidden="true">GH</span>
          GitHub
        </a>
        <AuthStatus />
      </nav>
    </header>
  );
}
