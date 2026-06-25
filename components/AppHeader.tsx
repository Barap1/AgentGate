import Link from "next/link";
import { AuthStatus } from "@/components/AuthStatus";
import {
  BookOpen,
  GitBranch,
  History,
  Home,
  PlugZap,
  ShieldCheck
} from "lucide-react";

type AppHeaderProps = {
  active?: "home" | "sources" | "runs" | "docs" | "login";
};

const navItems = [
  { href: "/", label: "Home", active: "home", icon: Home },
  { href: "/sources", label: "Sources", active: "sources", icon: PlugZap },
  { href: "/runs", label: "Runs", active: "runs", icon: History },
  { href: "/docs", label: "API Docs", active: "docs", icon: BookOpen }
] as const;

export function AppHeader({ active = "home" }: AppHeaderProps) {
  return (
    <header className="app-header">
      <Link className="brand" href="/" aria-label="AgentGate scanner">
        <span className="brand-mark" aria-hidden="true">
          <ShieldCheck size={20} strokeWidth={2.2} />
        </span>
        <span>
          <strong>AgentGate</strong>
          <small>Untrusted input guardrail for AI agents</small>
        </span>
      </Link>
      <nav className="nav-links" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.active;

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={isActive ? "nav-link active" : "nav-link"}
              href={item.href}
              key={item.href}
            >
              <Icon aria-hidden="true" size={15} strokeWidth={2.1} />
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
          <GitBranch aria-hidden="true" size={15} strokeWidth={2.1} />
          GitHub
        </a>
        <AuthStatus />
      </nav>
    </header>
  );
}
