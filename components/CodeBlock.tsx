import { CopyButton } from "@/components/CopyButton";

type CodeBlockProps = {
  value: string;
  copyable?: boolean;
  emptyText?: string;
};

export function CodeBlock({
  value,
  copyable = false,
  emptyText = "None"
}: CodeBlockProps) {
  const displayValue = value.trim().length > 0 ? value : emptyText;

  return (
    <div className="code-frame">
      {copyable ? (
        <div className="code-actions">
          <CopyButton value={displayValue} />
        </div>
      ) : null}
      <pre className="code-block">{displayValue}</pre>
    </div>
  );
}
