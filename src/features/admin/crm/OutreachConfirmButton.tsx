import type { ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function OutreachConfirmButton({ title, description, confirmLabel, onConfirm, children, ...props }: Omit<ButtonProps, "onClick" | "title"> & {
  title: string; description: string; confirmLabel: string; onConfirm: () => void; children: ReactNode;
}) {
  return <AlertDialog>
    <AlertDialogTrigger asChild><Button type="button" {...props}>{children}</Button></AlertDialogTrigger>
    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Go back</AlertDialogCancel><AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
