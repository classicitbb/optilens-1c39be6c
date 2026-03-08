import { Download, Edit3, Paintbrush, RotateCcw, Upload, Users } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMoonshotStore } from "@/features/admin/moonshot/lib/store";
import type { MoonshotSettings, PermissionLevel } from "@/features/admin/moonshot/lib/types";

const permissionOptions: { value: PermissionLevel; label: string }[] = [
  { value: "none", label: "No access" },
  { value: "view", label: "View" },
  { value: "edit", label: "Edit" },
  { value: "admin", label: "Admin" },
];

function SettingCheckbox({ label, checked, onCheckedChange, hint }: { label: string; checked: boolean; onCheckedChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 py-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(Boolean(v))} />
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}

function SettingSelect({ label, value, options, onValueChange }: { label: string; value: string; options: { value: string; label: string }[]; onValueChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-[1fr_240px] items-center gap-4 py-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function SettingPermission({ label, value, onValueChange }: { label: string; value: PermissionLevel; onValueChange: (v: PermissionLevel) => void }) {
  return <SettingSelect label={label} value={value} options={permissionOptions} onValueChange={(v) => onValueChange(v as PermissionLevel)} />;
}

export default function MoonshotSettingsPage() {
  const { settings, updateSettings, theme, setTheme, importDemoData, resetDemoData } = useMoonshotStore();
  const navigate = useNavigate();
  const [rawJson, setRawJson] = useState("");

  const patch = <K extends keyof MoonshotSettings>(key: K, value: MoonshotSettings[K]) => updateSettings({ [key]: value } as Partial<MoonshotSettings>);

  const exportJson = () => {
    const data = useMoonshotStore.getState();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
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
      importDemoData(JSON.parse(rawJson));
      toast.success("Moonshot data imported");
      setRawJson("");
    } catch {
      toast.error("Invalid JSON payload");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div />
        <Button variant="outline" onClick={() => navigate("/admin/moonshot/tools/org-chart")} className="gap-2">
          <Users className="h-4 w-4" /> Manage Users
        </Button>
      </div>
      <Card className="rounded-xl border bg-card shadow-sm">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-2xl">Settings</CardTitle>
          <CardDescription>Control organization permissions, defaults, integrations, and Moonshot preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pt-5">
          <div className="grid grid-cols-[1fr_240px] items-center gap-4 py-1.5">
            <Label className="text-sm font-medium">Organization name</Label>
            <Input value={settings.organizationName} onChange={(e) => patch("organizationName", e.target.value)} />
          </div>

          <SettingCheckbox label="Enable Zapier" checked={settings.enableZapier} onCheckedChange={(v) => patch("enableZapier", v)} />
          <SettingPermission label="Edit Org Chart" value={settings.editOrgChartPermission} onValueChange={(v) => patch("editOrgChartPermission", v)} />
          <SettingPermission label="Add/Upgrade users" value={settings.addUpgradeUsersPermission} onValueChange={(v) => patch("addUpgradeUsersPermission", v)} />
          <SettingPermission label="Edit/Delete users" value={settings.editDeleteUsersPermission} onValueChange={(v) => patch("editDeleteUsersPermission", v)} />

          <SettingCheckbox label="Managers are admins" checked={settings.managersAreAdmins} onCheckedChange={(v) => patch("managersAreAdmins", v)} />
          <SettingCheckbox label="Managers only see Rocks and KPIs under them" checked={settings.managerSeeOwnRocksAndKpisOnly} onCheckedChange={(v) => patch("managerSeeOwnRocksAndKpisOnly", v)} />
          <SettingCheckbox label="Supervisors can edit their accountabilities" checked={settings.supervisorsEditAccountabilities} onCheckedChange={(v) => patch("supervisorsEditAccountabilities", v)} />
          <SettingCheckbox label="Employees can edit their accountabilities" checked={settings.employeesEditAccountabilities} onCheckedChange={(v) => patch("employeesEditAccountabilities", v)} />
          <SettingCheckbox label="Supervisors can remove users" checked={settings.supervisorsRemoveUsers} onCheckedChange={(v) => patch("supervisorsRemoveUsers", v)} />
          <SettingCheckbox label="Supervisors can edit positions" checked={settings.supervisorsEditPositions} onCheckedChange={(v) => patch("supervisorsEditPositions", v)} />
          <SettingCheckbox label="Allow users to move rapid fire zones to any meeting" checked={settings.allowRapidFireAcrossMeetings} onCheckedChange={(v) => patch("allowRapidFireAcrossMeetings", v)} hint="[?]" />
          <SettingCheckbox label="Allow users to share good news to any meeting" checked={settings.allowGoodNewsAcrossMeetings} onCheckedChange={(v) => patch("allowGoodNewsAcrossMeetings", v)} hint="[?]" />
          <SettingCheckbox label="Allow adding clients as users" checked={settings.allowAddingClientsAsUsers} onCheckedChange={(v) => patch("allowAddingClientsAsUsers", v)} />
          <SettingCheckbox label="Send email invitations by default" checked={settings.sendEmailInvitationsByDefault} onCheckedChange={(v) => patch("sendEmailInvitationsByDefault", v)} />

          <div className="grid grid-cols-[1fr_240px] items-center gap-4 py-1.5">
            <Label className="text-sm font-medium">Current Quarter</Label>
            <div className="flex items-center gap-2">
              <Input value={settings.currentQuarter} onChange={(e) => patch("currentQuarter", e.target.value)} />
              <Button variant="outline" size="sm" onClick={() => toast.success("Quarter updated")}>
                <Edit3 className="mr-1 h-3.5 w-3.5" /> Edit
              </Button>
            </div>
          </div>

          <SettingSelect label="Time-zone" value={settings.timeZone} options={[
            { value: "(UTC-03:00) Paraguay Time", label: "(UTC-03:00) Paraguay Time" },
            { value: "(UTC-05:00) Eastern Time", label: "(UTC-05:00) Eastern Time" },
            { value: "(UTC+00:00) GMT", label: "(UTC+00:00) GMT" },
          ]} onValueChange={(v) => patch("timeZone", v)} />
          <SettingSelect label="Week start" value={settings.weekStart} options={[{ value: "Sunday", label: "Sunday" }, { value: "Monday", label: "Monday" }]} onValueChange={(v) => patch("weekStart", v as MoonshotSettings["weekStart"])} />
          <SettingSelect label="Date Format" value={settings.dateFormat} options={[{ value: "dd-mm-yyyy", label: "dd-mm-yyyy" }, { value: "mm-dd-yyyy", label: "mm-dd-yyyy" }, { value: "yyyy-mm-dd", label: "yyyy-mm-dd" }]} onValueChange={(v) => patch("dateFormat", v as MoonshotSettings["dateFormat"])} />
          <SettingSelect label="Number Format" value={settings.numberFormat} options={[{ value: "1,234,567.90", label: "1,234,567.90" }, { value: "1.234.567,90", label: "1.234.567,90" }]} onValueChange={(v) => patch("numberFormat", v as MoonshotSettings["numberFormat"])} />
          <SettingSelect label="Default time to send action Email" value={settings.defaultActionEmailTime} options={[{ value: "2 PM (GMT)", label: "2 PM (GMT)" }, { value: "9 AM (GMT)", label: "9 AM (GMT)" }, { value: "6 PM (GMT)", label: "6 PM (GMT)" }]} onValueChange={(v) => patch("defaultActionEmailTime", v)} />
          <SettingSelect label="Scorecard Period" value={settings.scorecardPeriod} options={[{ value: "Daily", label: "Daily" }, { value: "Weekly", label: "Weekly" }, { value: "Monthly", label: "Monthly" }, { value: "Quarterly", label: "Quarterly" }]} onValueChange={(v) => patch("scorecardPeriod", v as MoonshotSettings["scorecardPeriod"])} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-xl border bg-card">
          <CardHeader><CardTitle>Data Portability</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={exportJson} className="w-full justify-start"><Download className="mr-2 h-4 w-4" />Export all data as JSON</Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start"><Upload className="mr-2 h-4 w-4" />Import demo data</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Demo Data</DialogTitle>
                  <DialogDescription>Paste previously exported Moonshot JSON payload.</DialogDescription>
                </DialogHeader>
                <Textarea value={rawJson} onChange={(e) => setRawJson(e.target.value)} className="min-h-48" placeholder="Paste exported JSON here" />
                <Button onClick={importJson}>Import</Button>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card className="rounded-xl border bg-card">
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

        <Card className="rounded-xl border bg-card">
          <CardHeader><CardTitle>Danger Zone</CardTitle></CardHeader>
          <CardContent>
            <Button variant="destructive" className="w-full justify-start" onClick={() => { resetDemoData(); toast.success("Demo data reset completed"); }}>
              <RotateCcw className="mr-2 h-4 w-4" />Reset Demo Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
