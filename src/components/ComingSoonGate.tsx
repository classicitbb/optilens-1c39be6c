import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import cleanLogoSmooth from "@/assets/clean_logo_smooth.svg";

const STORAGE_KEY = "coming_soon_bypass";

export const useComingSoonBypassed = () => {
  return localStorage.getItem(STORAGE_KEY) === "true";
};

const ComingSoonGate = ({ children }: { children: React.ReactNode }) => {
  const [bypassed, setBypassed] = useState(() => localStorage.getItem(STORAGE_KEY) === "true");

  const handleEnter = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setBypassed(true);
  }, []);

  if (bypassed) return <>{children}</>;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <img src={cleanLogoSmooth} alt="Classic Visions logo" className="mb-8 h-14 w-auto" />

      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        Coming Soon
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        We're working on something great. Enter site to preview.
      </p>

      <Button onClick={handleEnter} className="mt-8 w-full max-w-xs">
        Enter Site
      </Button>

      <p className="mt-12 text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Classic Visions. All rights reserved.
      </p>
    </main>
  );
};

export default ComingSoonGate;
