import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentGate",
  description: "Prompt-injection sanitization gateway for untrusted AI agent inputs."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="app-footer">
          Prototype guardrail gateway. Do not submit sensitive data.
        </footer>
      </body>
    </html>
  );
}
