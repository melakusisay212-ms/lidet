import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export type ConfirmOptions = { title: string; message?: string; confirmLabel: string; cancelLabel: string; destructive?: boolean };
type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };
type DialogApi = { confirm: (o: ConfirmOptions) => Promise<boolean>; toast: (message: string) => void };

const Ctx = createContext<DialogApi | null>(null);

export function useDialogs(): DialogApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDialogs outside DialogProvider");
  return v;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...o, resolve })), []);
  const toast = useCallback((m: string) => {
    setMessage(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(null), 3200);
  }, []);

  const close = (ok: boolean) => { pending?.resolve(ok); setPending(null); };
  useEffect(() => { if (pending) confirmRef.current?.focus(); }, [pending]);

  return (
    <Ctx.Provider value={{ confirm, toast }}>
      {children}
      {pending && (
        <div className="scrim" role="presentation" onClick={() => close(false)}>
          <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="dlg-title" className="h-md">{pending.title}</h2>
            {pending.message && <p className="muted">{pending.message}</p>}
            <div className="dialog-actions">
              <button type="button" className="btn btn-quiet" onClick={() => close(false)}>{pending.cancelLabel}</button>
              <button type="button" ref={confirmRef} className={pending.destructive ? "btn btn-danger" : "btn btn-primary"} onClick={() => close(true)}>{pending.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}
      {message && <div className="toast" role="status" aria-live="polite">{message}</div>}
    </Ctx.Provider>
  );
}
