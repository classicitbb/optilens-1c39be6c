import type { FormEvent, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Native selects keep these forms plain FormData posts.
export const NativeSelect = ({ id, name, defaultValue, options }: { id: string; name: string; defaultValue?: string | null; options: Record<string, string> }) => (
  <select id={id} name={name} defaultValue={defaultValue ?? undefined} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
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

export const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <Card>
    <CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
    <CardContent className="space-y-4">{children}</CardContent>
  </Card>
);
