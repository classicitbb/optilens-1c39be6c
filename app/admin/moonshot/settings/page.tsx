"use client";

import { Download, Paintbrush, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMoonshotStore } from "../lib/store";

export default function MoonshotSettingsPage() {
  const store = useMoonshotStore();
  const { theme, setTheme, importDemoData } = store;
  const [rawJson, setRawJson] = useState("");

  const exportJson = () => {
    const data = useMoonshotStore.getState();
    const serialized = JSON.stringify(data, null, 2);
    const blob = new Blob([serialized], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "moonshot-export.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Moonshot data exported");
  };

  const importJson = () => {
    try {
      const parsed = JSON.parse(rawJson);
      importDemoData(parsed);
      toast.success("Moonshot data imported");
      setRawJson("");
    } catch {
      toast.error("Invalid JSON payload");
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-xl border bg-white">
        <CardHeader><CardTitle>Data Portability</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={exportJson} className="w-full justify-start"><Download className="h-4 w-4 mr-2" />Export all data as JSON</Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start"><Upload className="h-4 w-4 mr-2" />Import demo data</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Import Demo Data</DialogTitle></DialogHeader>
              <Textarea value={rawJson} onChange={(e) => setRawJson(e.target.value)} className="min-h-48" placeholder='Paste exported JSON here' />
              <Button onClick={importJson}>Import</Button>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card className="rounded-xl border bg-white">
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Label className="flex items-center gap-2"><Paintbrush className="h-4 w-4" />Theme switcher</Label>
          <Select value={theme} onValueChange={(v: "light" | "dark") => { setTheme(v); toast.info(`Theme changed to ${v}`); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
}
