import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Undo2, Redo2, Type, Image, Square, Table2, Layers, Minus, Plus, Download, Save, Upload, ChevronDown } from "lucide-react";
import type { CanvasObject, CanvasObjectType } from "../types";

interface Props {
  templateId: number;
  templateName: string;
  status: string;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onInsert: (type: CanvasObjectType, overrides?: Partial<CanvasObject>) => void;
  onSave: () => Promise<void>;
  onSaveAndExit: () => Promise<void>;
  onPublish: () => Promise<void>;
  onExport?: () => void;
}

const CanvasToolbar = ({
  templateId,
  templateName,
  status,
  zoom,
  onZoomChange,
  onInsert,
  onSave,
  onSaveAndExit,
  onPublish,
  onExport,
}: Props) => {
  const navigate = useNavigate();

  const handleInsertPricing = (sectionType: "rx_prices" | "stock_prices" | "supplies_prices", format: "list" | "matrix" = "list") => {
    const label =
      sectionType === "rx_prices"
        ? `RX Prices${format === "matrix" ? " Matrix" : ""}`
        : sectionType === "stock_prices"
          ? "Stock Prices"
          : "Supplies Prices";

    onInsert("pricing_block", {
      label,
      content: {
        section_type: sectionType,
        format,
        pricelist_version_id: null,
        custom_title: "",
      },
    });
  };

  const handleInsertArticle = (sectionType: string, label: string) => {
    onInsert("article_block", {
      label,
      content: {
        section_type: sectionType,
        article_id: null,
        text_mode: "summary",
        custom_title: "",
      },
    });
  };

  return (
    <div className="h-[46px] bg-background border-b flex items-center px-3 gap-0 shrink-0 z-50">
      {/* Back + breadcrumb */}
      <div className="flex items-center gap-2 pr-3.5 border-r mr-2 cursor-pointer" onClick={() => navigate("/admin/pricing/publisher")}>
        <div className="w-[26px] h-[26px] rounded-md border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground hover:text-foreground cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate("/admin/pricing/publisher"); }}>Publisher</span>
          <span className="text-muted-foreground/50">/</span>
          <span className="font-medium text-foreground">{templateName}</span>
        </div>
      </div>

      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5 px-2 border-r">
        <Button variant="ghost" size="sm" className="h-7 px-1.5 text-muted-foreground text-xs gap-1.5" disabled><Undo2 className="h-3.5 w-3.5" />Undo</Button>
        <Button variant="ghost" size="sm" className="h-7 px-1.5 text-muted-foreground text-xs gap-1.5" disabled><Redo2 className="h-3.5 w-3.5" />Redo</Button>
      </div>

      {/* Insert tools */}
      <div className="flex items-center gap-0.5 px-2 border-r">
        <Button variant="ghost" size="sm" className="h-7 px-1.5 text-muted-foreground text-xs gap-1.5" onClick={() => onInsert("text")}>
          <Type className="h-3.5 w-3.5" />Text
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-1.5 text-muted-foreground text-xs gap-1.5" onClick={() => onInsert("image")}>
          <Image className="h-3.5 w-3.5" />Image
        </Button>

        {/* Shape dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-1.5 text-muted-foreground text-xs gap-1">
              <Square className="h-3.5 w-3.5" />Shape<ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onInsert("shape_rect")}>Rectangle</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onInsert("shape_circle")}>Circle / Ellipse</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onInsert("shape_line")}>Line</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="sm" className="h-7 px-1.5 text-muted-foreground text-xs gap-1.5" onClick={() => onInsert("table")}>
          <Table2 className="h-3.5 w-3.5" />Table
        </Button>

        <div className="w-px h-[18px] bg-border mx-1" />

        {/* Pricing/content dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-1.5 text-xs gap-1 bg-accent/10 text-accent border-accent/20 border">
              <Layers className="h-3.5 w-3.5" />Pricing<ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            <DropdownMenuItem onClick={() => handleInsertPricing("rx_prices", "list")}>
              <span className="inline-flex items-center h-4 px-1.5 rounded text-[9px] font-medium bg-primary/10 text-primary mr-2">rx</span>Rx Prices — list
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleInsertPricing("rx_prices", "matrix")}>
              <span className="inline-flex items-center h-4 px-1.5 rounded text-[9px] font-medium bg-primary/10 text-primary mr-2">rx</span>Rx Prices — matrix
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleInsertPricing("stock_prices")}>
              <span className="inline-flex items-center h-4 px-1.5 rounded text-[9px] font-medium bg-primary/10 text-primary mr-2">stock</span>Stock Prices
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleInsertPricing("supplies_prices")}>
              <span className="inline-flex items-center h-4 px-1.5 rounded text-[9px] font-medium bg-primary/10 text-primary mr-2">supplies</span>Supplies Prices
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleInsertArticle("knowledge_article", "Knowledge Article")}>
              <span className="inline-flex items-center h-4 px-1.5 rounded text-[9px] font-medium bg-green-500/10 text-green-700 mr-2">article</span>Knowledge Article
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleInsertArticle("terms_conditions", "Terms & Conditions")}>
              <span className="inline-flex items-center h-4 px-1.5 rounded text-[9px] font-medium bg-amber-500/10 text-amber-700 mr-2">fixed</span>Terms &amp; Conditions
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleInsertArticle("contact_information", "Contact Information")}>
              <span className="inline-flex items-center h-4 px-1.5 rounded text-[9px] font-medium bg-amber-500/10 text-amber-700 mr-2">fixed</span>Contact Information
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleInsertArticle("additional_charges", "Additional Charges")}>
              <span className="inline-flex items-center h-4 px-1.5 rounded text-[9px] font-medium bg-amber-500/10 text-amber-700 mr-2">fixed</span>Additional Charges
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Zoom */}
      <div className="flex items-center gap-0.5 px-2 border-r">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground border" onClick={() => onZoomChange(zoom - 10)}>
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="text-[11.5px] text-muted-foreground min-w-[34px] text-center font-mono">{zoom}%</span>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground border" onClick={() => onZoomChange(zoom + 10)}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-1.5 text-muted-foreground text-xs" onClick={() => onZoomChange(100)}>Fit</Button>
      </div>

      {/* Right side: status + actions */}
      <div className="ml-auto flex items-center gap-1.5">
        <div className="flex items-center rounded-md border border-border bg-muted/20 p-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 rounded px-2 text-[11px]"
            onClick={() => navigate(`/admin/pricing/publisher/${templateId}`)}
          >
            Classic
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-6 rounded px-2 text-[11px]"
            onClick={() => navigate(`/admin/pricing/publisher/${templateId}/canvas`)}
          >
            Canvas
          </Button>
        </div>
        <div className={`h-5 px-2 rounded-full text-[11px] font-medium flex items-center gap-1 ${status === "published" ? "bg-green-500/10 text-green-700" : "bg-amber-500/10 text-amber-700"}`}>
          <span className="w-[5px] h-[5px] rounded-full bg-current" />
          {status === "published" ? "Published" : "Draft"}
        </div>
        <div className="w-px h-[18px] bg-border mx-1" />
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => void onSave()}>
          <Save className="h-3.5 w-3.5" />Save
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => void onSaveAndExit()}>
          Save &amp; Exit
        </Button>
        <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => void onPublish()}>
          <Upload className="h-3.5 w-3.5" />Publish
        </Button>
        <div className="w-px h-[18px] bg-border mx-1" />
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={onExport} disabled={!onExport}>
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default CanvasToolbar;
