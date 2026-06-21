"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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
    <Button
      aria-live="polite"
      className="copy-button"
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
    >
      {status === "copied" ? "Copied" : status === "failed" ? "Failed" : label}
    </Button>
  );
}
