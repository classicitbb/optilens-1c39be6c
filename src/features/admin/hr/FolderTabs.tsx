import type { ComponentProps } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/**
 * Tabs drawn like folder tabs: the selected tab is raised, marked with an accent bar, and open
 * into the panel below it, so it is clear which section you are in and what belongs to it.
 */
export const FolderTabs = ({ className, ...props }: ComponentProps<typeof Tabs>) => (
  <Tabs className={cn("space-y-0", className)} {...props} />
);

export const FolderTabsList = ({ className, ...props }: ComponentProps<typeof TabsList>) => (
  <TabsList className={cn("flex h-auto w-full flex-wrap items-end justify-start gap-1 rounded-none border-b bg-transparent p-0 text-muted-foreground", className)} {...props} />
);

export const FolderTab = ({ className, ...props }: ComponentProps<typeof TabsTrigger>) => (
  <TabsTrigger
    className={cn(
      "-mb-px !rounded-b-none rounded-t-md border border-b-0 border-transparent px-4 py-2 hover:bg-muted/60 hover:text-foreground",
      "data-[state=active]:border-border data-[state=active]:border-t-2 data-[state=active]:border-t-primary data-[state=active]:bg-muted data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none",
      className,
    )}
    {...props}
  />
);

export const FolderPanel = ({ className, ...props }: ComponentProps<typeof TabsContent>) => (
  <TabsContent className={cn("mt-0 space-y-3 rounded-b-lg border border-t-0 bg-muted p-3 focus-visible:ring-0", className)} {...props} />
);
