import type { ReactNode } from "react";

type FieldLabelProps = {
  htmlFor: string;
  label: string;
  helper?: ReactNode;
};

export function FieldLabel({ htmlFor, label, helper }: FieldLabelProps) {
  return (
    <div className="field-label-row">
      <label htmlFor={htmlFor}>{label}</label>
      {helper ? <p>{helper}</p> : null}
    </div>
  );
}
