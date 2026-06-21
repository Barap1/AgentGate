import type { ReactNode } from "react";

type PageHeaderProps = {
  label?: string;
  titleId?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
};

export function PageHeader({
  label,
  titleId,
  title,
  children,
  action
}: PageHeaderProps) {
  return (
    <section className="page-header">
      <div>
        {label ? <p className="section-kicker">{label}</p> : null}
        <h1 id={titleId}>{title}</h1>
        {children ? <div className="page-header-copy">{children}</div> : null}
      </div>
      {action ? <div className="page-header-action">{action}</div> : null}
    </section>
  );
}
