import { MoonshotShell } from "./components/moonshot-shell";

export default function MoonshotLayout({ children }: { children: React.ReactNode }) {
  return <MoonshotShell>{children}</MoonshotShell>;
}
