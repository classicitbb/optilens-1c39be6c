import type { ReactNode } from "react";
import { Check, Settings2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { usePushToTalk } from "@/features/admin/copilot/usePushToTalk";

type VoiceSettingsMenuProps = {
  speech: ReturnType<typeof usePushToTalk>;
  holdToRecord: boolean;
  onHoldToRecordChange: (next: boolean) => void;
  /** Omit on surfaces that have no advanced panel — the item is then hidden. */
  onOpenAdvanced?: () => void;
  /** Unique per surface — the widget and the console can both be mounted. */
  switchId: string;
  align?: "start" | "end";
  children: ReactNode;
};

/**
 * The microphone picker shared by the floating Copilot widget and the
 * full-page console. Each surface owns its own trigger and its own
 * holdToRecord/advanced state; this component is only the menu body.
 */
export const VoiceSettingsMenu = ({
  speech,
  holdToRecord,
  onHoldToRecordChange,
  onOpenAdvanced,
  switchId,
  align = "start",
  children,
}: VoiceSettingsMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
    <DropdownMenuContent align={align} className="w-72">
      <DropdownMenuLabel className="px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Microphone</DropdownMenuLabel>
      <div className="max-h-64 overflow-y-auto">
        <DropdownMenuItem
          className="flex items-center justify-between gap-2"
          onSelect={() => speech.setSettings((current) => ({ ...current, deviceId: "default" }))}
        >
          <span className="truncate">System default</span>
          {speech.settings.deviceId === "default" ? <Check className="h-4 w-4 shrink-0" /> : null}
        </DropdownMenuItem>
        {speech.devices.filter((device) => device.deviceId && device.deviceId !== "default").map((device, index) => (
          <DropdownMenuItem
            key={device.deviceId}
            className="flex items-center justify-between gap-2"
            onSelect={() => speech.setSettings((current) => ({ ...current, deviceId: device.deviceId }))}
          >
            <span className="truncate">{device.label || `Microphone ${index + 1}`}</span>
            {speech.settings.deviceId === device.deviceId ? <Check className="h-4 w-4 shrink-0" /> : null}
          </DropdownMenuItem>
        ))}
      </div>
      <DropdownMenuSeparator />
      <div className="flex items-center justify-between px-2 py-1 text-[11px]">
        <Label htmlFor={switchId} className="cursor-pointer font-normal">Hold to record</Label>
        <Switch id={switchId} checked={holdToRecord} onCheckedChange={onHoldToRecordChange} />
      </div>
      {onOpenAdvanced ? (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onOpenAdvanced()}>
            <Settings2 className="mr-1.5 h-3 w-3" /> More voice settings
          </DropdownMenuItem>
        </>
      ) : null}
    </DropdownMenuContent>
  </DropdownMenu>
);

export default VoiceSettingsMenu;
