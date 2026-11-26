import { useId, useState, type ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/** Native constraints remain authoritative; expose feedback after blur or a submit attempt. */
export function RequestField({ id: suppliedId, label, value, onValueChange, multiline = false, type = "text", autoComplete, disabled = false, placeholder }: {
  id?: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  multiline?: boolean;
  type?: "text" | "email";
  autoComplete?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const [error, setError] = useState("");
  const validate = (field: HTMLInputElement | HTMLTextAreaElement) => {
    const blankMessage = `Enter ${label.toLowerCase()}.`;
    field.setCustomValidity(field.value.trim() ? "" : blankMessage);
    return !field.value.trim() ? blankMessage : field.validity.typeMismatch ? "Enter an email address like name@example.com." : "";
  };
  const onChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const nextError = validate(event.currentTarget);
    if (error) setError(nextError);
    onValueChange(event.currentTarget.value);
  };
  const shared = {
    id, value, disabled, placeholder, required: true, autoComplete,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? `${id}-error` : undefined,
    onChange,
    onBlur: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => setError(validate(event.currentTarget)),
    onInvalid: (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => setError(validate(event.currentTarget)),
    ref: (field: HTMLInputElement | HTMLTextAreaElement | null) => { if (field) validate(field); },
  };
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label} <span className="font-normal text-muted-foreground">(required)</span></Label>
      {multiline ? <Textarea {...shared} className="min-h-32 assistant-scrollbar" /> : <Input {...shared} type={type} />}
      {error ? <p id={`${id}-error`} className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
