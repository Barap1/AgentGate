import Link from "next/link";

type AppHeaderProps = {
  active?: "home" | "sources" | "runs" | "docs";
};

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
        <Link className={active === "home" ? "nav-link active" : "nav-link"} href="/">
          Home
        </Link>
        <Link
          className={active === "sources" ? "nav-link active" : "nav-link"}
          href="/sources"
        >
          Sources
        </Link>
        <Link className={active === "runs" ? "nav-link active" : "nav-link"} href="/runs">
          Runs
        </Link>
        <Link className={active === "docs" ? "nav-link active" : "nav-link"} href="/docs">
          API Docs
        </Link>
        <a
          className="nav-link"
          href="https://github.com/Barap1/AgentGate"
          rel="noreferrer"
          target="_blank"
        >
          GitHub
        </a>
      </nav>
    </header>
  );
}
