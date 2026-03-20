import { useState, useCallback } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import cleanLogoSmooth from "@/assets/clean_logo_smooth.svg";

const STORAGE_KEY = "coming_soon_bypass";
const SITE_PASSWORD = "preview2026";

export const useComingSoonBypassed = () => {
  return localStorage.getItem(STORAGE_KEY) === "true";
};

const ComingSoonGate = ({ children }: { children: React.ReactNode }) => {
  const [bypassed, setBypassed] = useState(() => localStorage.getItem(STORAGE_KEY) === "true");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (password === SITE_PASSWORD) {
        localStorage.setItem(STORAGE_KEY, "true");
        setBypassed(true);
        setError(false);
      } else {
        setError(true);
      }
    },
    [password],
  );

  if (bypassed) return <>{children}</>;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <img src={cleanLogoSmooth} alt="OptiLens logo" className="mb-8 h-14 w-auto" />

      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        Coming Soon
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        We're working on something great. Enter the site password to preview.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            className="pl-10"
            autoFocus
          />
        </div>
        {error && <p className="text-xs text-destructive">Incorrect password. Please try again.</p>}
        <Button type="submit" className="w-full">
          Enter Site
        </Button>
      </form>

      <p className="mt-12 text-xs text-muted-foreground/60">
        &copy; {new Date().getFullYear()} OptiLens. All rights reserved.
      </p>
    </div>
  );
};

export default ComingSoonGate;
