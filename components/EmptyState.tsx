type EmptyStateProps = {
  title: string;
  body: string;
};

export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-rule" aria-hidden="true" />
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}
