import { useId, useLayoutEffect, useRef } from "react";
import { insertPhrase, SUGGESTIONS, TEXT_PLACEHOLDER, type TextField } from "../lib/suggestions";

interface Props {
  field: TextField;
  value: string;
  disabled?: boolean;
  onChange: (v: string) => void;
}

/** Textarea with a structure-hint placeholder and clickable phrase chips (append, never replace). */
export function AssistedTextarea({ field, value, disabled, onChange }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const chipsId = useId();
  const pending = useRef<{ selStart: number; selEnd: number } | null>(null);
  // After the inserted text is rendered: focus the textarea and select the "…" gap / caret at end.
  useLayoutEffect(() => {
    const el = ref.current;
    const sel = pending.current;
    if (!el || !sel) return;
    pending.current = null;
    el.focus();
    el.setSelectionRange(sel.selStart, sel.selEnd);
  }, [value]);
  const add = (phrase: string) => {
    const r = insertPhrase(value, phrase);
    pending.current = r;
    onChange(r.text);
  };
  return (
    <>
      <textarea ref={ref} rows={4} value={value} disabled={disabled} placeholder={TEXT_PLACEHOLDER[field]}
        aria-describedby={chipsId} onChange={(e) => onChange(e.target.value)} />
      {!disabled && (
        <div className="chips" role="group" id={chipsId} aria-label="Formulierungshilfen (werden angehängt)">
          {SUGGESTIONS[field].map((s) => (
            <button type="button" key={s} className="chip" onClick={() => add(s)} title="Text anhängen">+ {s}</button>
          ))}
        </div>
      )}
    </>
  );
}
