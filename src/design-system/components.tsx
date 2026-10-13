import { useId } from "react";
import type { ReactNode } from "react";
import { Icon } from "./icons.tsx";
import type { IconName } from "./icons.tsx";

export function Button(props: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "outline" | "quiet" | "danger";
  icon?: IconName; disabled?: boolean; loading?: boolean; block?: boolean; type?: "button" | "submit"; ariaLabel?: string;
}) {
  const { children, onClick, variant = "primary", icon, disabled, loading, block, type = "button", ariaLabel } = props;
  return (
    <button type={type} className={`btn btn-${variant}${block ? " btn-block" : ""}`} onClick={onClick} disabled={disabled || loading} aria-busy={loading || undefined} aria-label={ariaLabel}>
      {loading ? <span className="spinner" aria-hidden="true" /> : icon ? <Icon name={icon} size={20} /> : null}
      {children}
    </button>
  );
}

export function IconButton({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return <button type="button" className="icon-btn" aria-label={label} onClick={onClick}><Icon name={icon} /></button>;
}

export function Chip({ label, pressed, onClick, icon }: { label: string; pressed: boolean; onClick: () => void; icon?: ReactNode }) {
  return (
    <button type="button" className="chip" aria-pressed={pressed} onClick={onClick}>
      {pressed ? <Icon name="check" size={16} /> : icon}
      {label}
    </button>
  );
}

export function Card({ children, flat }: { children: ReactNode; flat?: boolean }) {
  return <div className={`card${flat ? " flat" : ""}`}>{children}</div>;
}

export function Badge({ tone = "neutral", children }: { tone?: "warn" | "ok" | "neutral"; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Field(props: { label: string; help?: string; error?: string | null; children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode }) {
  const id = useId();
  const hid = `${id}-h`;
  const describedBy = props.error || props.help ? hid : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{props.label}</label>
      {props.children({ id, describedBy, invalid: !!props.error })}
      {props.error ? <div id={hid} className="error-text" role="alert"><Icon name="alert" size={16} />{props.error}</div> : props.help ? <div id={hid} className="help">{props.help}</div> : null}
    </div>
  );
}

export function TextField(props: { label: string; value: string; onChange: (v: string) => void; help?: string; error?: string | null; type?: "text" | "tel" | "search"; maxLength?: number; autoFocus?: boolean; placeholder?: string }) {
  return (
    <Field label={props.label} help={props.help} error={props.error}>
      {({ id, describedBy, invalid }) => (
        <input id={id} className="input" type={props.type ?? "text"} value={props.value} maxLength={props.maxLength} placeholder={props.placeholder} autoFocus={props.autoFocus}
          aria-invalid={invalid} aria-describedby={describedBy} onChange={(e) => props.onChange(e.target.value)} />
      )}
    </Field>
  );
}

export function TextArea(props: { label: string; value: string; onChange: (v: string) => void; help?: string; maxLength?: number }) {
  return (
    <Field label={props.label} help={props.help}>
      {({ id, describedBy }) => <textarea id={id} className="textarea" value={props.value} maxLength={props.maxLength} aria-describedby={describedBy} onChange={(e) => props.onChange(e.target.value)} />}
    </Field>
  );
}

export function SelectField<T extends string | number>(props: { label: string; value: T | ""; onChange: (v: string) => void; options: ReadonlyArray<{ value: T; label: string }>; placeholder?: string; error?: string | null; help?: string }) {
  return (
    <Field label={props.label} error={props.error} help={props.help}>
      {({ id, describedBy, invalid }) => (
        <select id={id} className="select" value={String(props.value)} aria-invalid={invalid} aria-describedby={describedBy} onChange={(e) => props.onChange(e.target.value)}>
          {props.placeholder !== undefined && <option value="">{props.placeholder}</option>}
          {props.options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
        </select>
      )}
    </Field>
  );
}

export function Switch({ label, help, checked, onChange }: { label: string; help?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="switch-row">
      <div className="grow"><label htmlFor={id} style={{ fontWeight: 700 }}>{label}</label>{help && <div className="help">{help}</div>}</div>
      <span className="switch">
        <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="track" aria-hidden="true" /><span className="thumb" aria-hidden="true" />
      </span>
    </div>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: ReadonlyArray<{ value: T; label: string }>; onChange: (v: T) => void }) {
  return (
    <div className="field">
      <div className="label" id={`seg-${label}`}>{label}</div>
      <div className="seg" role="group" aria-labelledby={`seg-${label}`}>
        {options.map((o) => <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>)}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="ring"><Icon name={icon} size={32} /></div>
      <h2 className="h-md">{title}</h2>
      {body && <p className="muted">{body}</p>}
      {action}
    </div>
  );
}

export function Screen(props: { title: string; onBack?: () => void; backLabel: string; actions?: ReactNode; footer?: ReactNode; children: ReactNode; withNav?: boolean; hidden?: boolean }) {
  return (
    <section className="screen" hidden={props.hidden} aria-label={props.title}>
      <header className="screen-top">
        {props.onBack && <IconButton icon="left" label={props.backLabel} onClick={props.onBack} />}
        <h1 className="h-lg grow" style={{ paddingLeft: props.onBack ? 0 : "var(--sp-2)" }}>{props.title}</h1>
        {props.actions}
      </header>
      <div className={`screen-body${props.withNav ? " with-nav" : ""}`}>{props.children}</div>
      {props.footer && <footer className="screen-foot">{props.footer}</footer>}
    </section>
  );
}

export function KV({ k, v }: { k: string; v: ReactNode }) {
  return <div className="kv"><span>{k}</span><span>{v}</span></div>;
}
