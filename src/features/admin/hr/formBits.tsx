import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Native selects keep these forms plain FormData posts.
export const NativeSelect = ({ id, name, defaultValue, options, disabled }: { id: string; name: string; defaultValue?: string | null; options: Record<string, string>; disabled?: boolean }) => (
  <select id={id} name={name} defaultValue={defaultValue ?? undefined} disabled={disabled} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60">
    {Object.entries(options).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
  </select>
);

export const useSubmit = () => {
  const { toast } = useToast();
  return (action: () => Promise<unknown>, success: string, onDone?: () => void) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await action();
      toast({ title: success });
      form.reset();
      onDone?.();
    } catch (error) {
      toast({ title: "Save failed", description: (error as Error).message, variant: "destructive" });
    }
  };
};

/** A card of records. `action` sits on the title row, usually a FormDialog button. */
export const Section = ({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) => (
  <Card>
    <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 px-4 pb-2 pt-3">
      <CardTitle className="text-base">{title}</CardTitle>
      {action}
    </CardHeader>
    <CardContent className="space-y-3 px-4 pb-4">{children}</CardContent>
  </Card>
);

const FormDialogContext = createContext<{ cancel: () => void } | null>(null);

const OPEN_FORM_EVENT = "hr:open-form";
/** Opens a FormDialog that was given this `id`, from anywhere on the page. */
export const openForm = (id: string) => {
  // A tab that was only just selected mounts a moment later, so keep asking until a pop-up answers.
  const detail = { id, handled: false };
  let tries = 0;
  const send = () => {
    window.dispatchEvent(new CustomEvent(OPEN_FORM_EVENT, { detail }));
    if (!detail.handled && tries++ < 20) setTimeout(send, 50);
  };
  send();
};

const FIRST_FIELD = "input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])";

/**
 * Forms that add or change records stay out of the page: a button opens them in a pop-up.
 * `children` gets `close`, to pass to useSubmit as its onDone so the pop-up closes once saved.
 * The pop-up focuses its first field, does not close on an outside click, and asks before
 * throwing away anything typed in. End each form with <FormActions> for a sticky Cancel / Save bar.
 */
export const FormDialog = ({
  id,
  title,
  trigger = title,
  description,
  disabled,
  variant = "outline",
  icon = true,
  narrow = false,
  children,
}: {
  id?: string;
  title: string;
  trigger?: string;
  description?: string;
  disabled?: boolean;
  variant?: "outline" | "default" | "secondary";
  icon?: boolean;
  narrow?: boolean;
  children: (close: () => void) => ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const dirty = useRef(false);

  useEffect(() => {
    if (!id) return;
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; handled: boolean }>).detail;
      if (detail?.id !== id) return;
      detail.handled = true;
      setOpen(true);
    };
    window.addEventListener(OPEN_FORM_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_FORM_EVENT, onOpen);
  }, [id]);
  useEffect(() => { if (open) dirty.current = false; }, [open]);

  const close = () => { dirty.current = false; setConfirming(false); setOpen(false); };
  const cancel = () => (dirty.current ? setConfirming(true) : close());

  return (
    <FormDialogContext.Provider value={{ cancel }}>
      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : cancel())}>
        <DialogTrigger asChild>
          <Button size="sm" variant={variant} disabled={disabled}>{icon && <Plus className="mr-1 h-4 w-4" />}{trigger}</Button>
        </DialogTrigger>
        <DialogContent
          className={cn("max-h-[90dvh] overflow-y-auto overscroll-contain motion-reduce:animate-none", narrow ? "sm:max-w-lg" : "sm:max-w-2xl")}
          onInteractOutside={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement).querySelector<HTMLElement>(FIRST_FIELD)?.focus();
          }}
          onInput={() => { dirty.current = true; }}
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children(close)}
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard what you've entered?</AlertDialogTitle>
            <AlertDialogDescription>Nothing has been saved yet.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={close}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormDialogContext.Provider>
  );
};

/** The last row of a form: Save, plus Cancel and a sticky bar when the form is in a FormDialog. */
export const FormActions = ({ submit, pending = false, disabled = false, className }: { submit: string; pending?: boolean; disabled?: boolean; className?: string }) => {
  const dialog = useContext(FormDialogContext);
  return (
    <div className={cn("col-span-full flex items-center justify-end gap-2", dialog && "sticky bottom-0 -mx-6 border-t bg-background px-6 py-3", className)}>
      {dialog && <Button type="button" variant="ghost" onClick={dialog.cancel}>Cancel</Button>}
      <Button type="submit" disabled={pending || disabled}>{pending ? "Saving…" : submit}</Button>
    </div>
  );
};
