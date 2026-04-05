import { ThemeProvider as NextThemesProvider } from "next-themes";
type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;
import * as React from "react";

const THEME_STORAGE_KEY = "classic-visions-theme";
const LEGACY_THEME_STORAGE_KEY = "optilens-theme";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  React.useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme) return;

    const legacyTheme = window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (!legacyTheme) return;

    window.localStorage.setItem(THEME_STORAGE_KEY, legacyTheme);
    window.localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      enableColorScheme
      disableTransitionOnChange
      storageKey={THEME_STORAGE_KEY}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
