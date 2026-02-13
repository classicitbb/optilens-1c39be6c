import { PackageOpen } from "lucide-react";

const ImportFramesTab = () => (
  <div className="flex flex-col items-center justify-center py-20 gap-3">
    <PackageOpen className="h-10 w-10" style={{ color: "hsl(215 15% 70%)" }} />
    <h3 className="text-sm font-medium" style={{ color: "hsl(215 15% 40%)" }}>Frames Import</h3>
    <p className="text-xs" style={{ color: "hsl(215 15% 60%)" }}>Coming soon — this feature is under development.</p>
  </div>
);

export default ImportFramesTab;
