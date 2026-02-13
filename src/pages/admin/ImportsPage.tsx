import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImportLensesTab from "@/components/admin/ImportLensesTab";
import ImportSuppliesTab from "@/components/admin/ImportSuppliesTab";
import ImportAddonsTab from "@/components/admin/ImportAddonsTab";
import ImportFramesTab from "@/components/admin/ImportFramesTab";

const ImportsPage = () => {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold" style={{ color: "hsl(215 30% 15%)" }}>Import Data</h1>

      <Tabs defaultValue="lenses" className="w-full">
        <TabsList className="h-8 p-0.5 gap-0.5" style={{ background: "hsl(215 10% 93%)", borderRadius: "4px" }}>
          <TabsTrigger value="lenses" className="text-xs h-7 px-3 data-[state=active]:shadow-none" style={{ borderRadius: "3px" }}>Lenses</TabsTrigger>
          <TabsTrigger value="supplies" className="text-xs h-7 px-3 data-[state=active]:shadow-none" style={{ borderRadius: "3px" }}>Supplies</TabsTrigger>
          <TabsTrigger value="addons" className="text-xs h-7 px-3 data-[state=active]:shadow-none" style={{ borderRadius: "3px" }}>Add-Ons</TabsTrigger>
          <TabsTrigger value="frames" className="text-xs h-7 px-3 data-[state=active]:shadow-none" style={{ borderRadius: "3px" }}>Frames</TabsTrigger>
        </TabsList>

        <TabsContent value="lenses"><ImportLensesTab /></TabsContent>
        <TabsContent value="supplies"><ImportSuppliesTab /></TabsContent>
        <TabsContent value="addons"><ImportAddonsTab /></TabsContent>
        <TabsContent value="frames"><ImportFramesTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default ImportsPage;
