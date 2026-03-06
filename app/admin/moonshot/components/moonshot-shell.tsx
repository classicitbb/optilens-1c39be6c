"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Moon, PanelLeft, Rocket, Sun } from "lucide-react";
import { useMoonshotStore } from "../lib/store";

const nav = [
  ["Dashboard", "/admin/moonshot/dashboard"],
  ["Workspace", "/admin/moonshot/workspace"],
  ["Meetings", "/admin/moonshot/meetings"],
  ["Scorecards", "/admin/moonshot/scorecards"],
  ["Rocks", "/admin/moonshot/rocks"],
  ["Todos", "/admin/moonshot/todos"],
  ["Issues", "/admin/moonshot/issues"],
  ["Business Plan", "/admin/moonshot/business-plan"],
  ["Tools", "/admin/moonshot/tools"],
  ["Users", "/admin/moonshot/Users"],
] as const;

export function MoonshotShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const { currentUser, login, logout } = useMoonshotStore();

  if (!currentUser) {
    return (
      <div className={`min-h-screen grid place-items-center p-6 ${dark ? "dark bg-slate-950" : "bg-slate-100"}`}>
        <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900">
          <h1 className="text-2xl font-semibold mb-2">Moonshot Login</h1>
          <p className="text-sm text-muted-foreground mb-4">Use local demo auth to continue.</p>
          <Input value="Classic" readOnly className="mb-4" />
          <Button className="w-full" onClick={login}>Login as Classic</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <aside className={`fixed z-40 inset-y-0 left-0 w-[280px] bg-[#0f766e] text-white p-4 transform transition ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
          <div className="flex items-center gap-2 font-semibold text-lg mb-6"><Rocket className="h-5 w-5" />Moonshot</div>
          <nav className="space-y-1">
            {nav.map(([label, href]) => (
              <Link key={href} href={href} onClick={() => setSidebarOpen(false)} className={`block rounded-md px-3 py-2 text-sm ${pathname === href ? "bg-[#14b8a6]" : "hover:bg-[#14b8a6]"}`}>
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="md:pl-[280px]">
          <header className="h-16 border-b bg-white dark:bg-slate-900 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen((v) => !v)}><PanelLeft className="h-5 w-5" /></Button>
              <Rocket className="h-5 w-5 text-teal-600" />
              <span className="font-medium">Moonshot Admin</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setDark((v) => !v)}>{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button>
              <Avatar className="h-8 w-8"><AvatarFallback>{currentUser.avatar}</AvatarFallback></Avatar>
              <Button variant="outline" size="sm" onClick={logout}>Logout</Button>
            </div>
          </header>
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
