"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/provider";
import { IS_STATIC } from "@/lib/static";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "color" | "date" | "select" | "checkbox";
  options?: { value: string; label: string }[];
  required?: boolean;
  step?: string;
};

export function FormDialog({
  title,
  fields,
  action,
  values,
  trigger,
}: {
  title: string;
  fields: Field[];
  action: (fd: FormData) => Promise<void>;
  values?: Record<string, any>;
  trigger: "new" | "edit";
}) {
  const [open, setOpen] = useState(false);
  const t = useT();

  if (IS_STATIC) return null; // read-only demo: no create/edit

  return (
    <>
      {trigger === "new" ? (
        <button
          onClick={() => setOpen(true)}
          className="bg-brand hover:bg-brand/80 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          + {t("action.new")}
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="text-brand hover:underline text-xs">
          {t("action.edit")}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{title}</h3>
            <form action={action} className="space-y-3">
              {values?.id && <input type="hidden" name="id" value={values.id} />}
              {fields.map((f) => (
                <div key={f.name}>
                  <label className="block text-xs text-muted mb-1">{f.label}</label>
                  {f.type === "select" ? (
                    <select
                      name={f.name}
                      defaultValue={values?.[f.name] ?? f.options?.[0]?.value}
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm"
                    >
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "checkbox" ? (
                    <input
                      type="checkbox"
                      name={f.name}
                      defaultChecked={values?.[f.name] ?? true}
                      className="w-4 h-4 accent-brand"
                    />
                  ) : (
                    <input
                      type={f.type ?? "text"}
                      name={f.name}
                      step={f.step}
                      required={f.required}
                      defaultValue={values?.[f.name] ?? ""}
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  )}
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-muted hover:text-text">
                  {t("action.cancel")}
                </button>
                <button type="submit" className="bg-brand hover:bg-brand/80 text-white text-sm font-medium px-4 py-2 rounded-lg">
                  {t("action.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function DeleteButton({ action, id }: { action: (fd: FormData) => Promise<void>; id: string }) {
  const t = useT();
  if (IS_STATIC) return null; // read-only demo: no delete
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-bad/80 hover:text-bad text-xs"
        onClick={(e) => {
          if (!confirm("Delete / Excluir?")) e.preventDefault();
        }}
      >
        {t("action.delete")}
      </button>
    </form>
  );
}
