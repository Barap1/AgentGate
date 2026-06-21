"use client";

import { useState } from "react";

type CopyButtonProps = {
  value: string;
  label?: string;
};

export function CopyButton({ value, label = "Copy" }: CopyButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }

    window.setTimeout(() => setStatus("idle"), 1600);
  }

  return (
    <button
      aria-live="polite"
      className="copy-button"
      type="button"
      onClick={handleCopy}
    >
      {status === "copied" ? "Copied" : status === "failed" ? "Failed" : label}
    </button>
  );
}
