import type { ReactNode } from "react";
import { Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { usePushToTalk } from "@/features/admin/copilot/usePushToTalk";

type VoiceSettingsMenuProps = {
  speech: ReturnType<typeof usePushToTalk>;
  holdToRecord: boolean;
  onHoldToRecordChange: (next: boolean) => void;
  /** Show language, confidence threshold and vocabulary fields inside the menu. */
  showAdvanced?: boolean;
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
  showAdvanced,
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
      {showAdvanced ? (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Recognition</DropdownMenuLabel>
          {/* Stop the menu's typeahead/arrow handling from stealing keystrokes in the fields. */}
          <div className="space-y-2.5 px-2 pb-1.5 pt-0.5" onKeyDown={(event) => event.stopPropagation()}>
            <div className="space-y-1">
              <Label htmlFor={`${switchId}-language`} className="text-[11px] font-normal text-muted-foreground">Language</Label>
              <select
                id={`${switchId}-language`}
                value={speech.settings.language}
                onChange={(event) => {
                  const language = event.target.value as "en-BB" | "en-US" | "en-GB";
                  speech.setSettings((current) => ({ ...current, language }));
                }}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="en-BB">English (Caribbean)</option>
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${switchId}-confidence`} className="text-[11px] font-normal text-muted-foreground">Confidence threshold</Label>
              <Input
                id={`${switchId}-confidence`}
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={speech.settings.confidenceThreshold}
                onChange={(event) => speech.setSettings((current) => ({ ...current, confidenceThreshold: Math.min(1, Math.max(0, Number(event.target.value))) }))}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${switchId}-vocabulary`} className="text-[11px] font-normal text-muted-foreground">Customer and lens vocabulary</Label>
              <Input
                id={`${switchId}-vocabulary`}
                value={speech.settings.vocabulary}
                onChange={(event) => speech.setSettings((current) => ({ ...current, vocabulary: event.target.value }))}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </>
      ) : null}
    </DropdownMenuContent>
  </DropdownMenu>
);

export default VoiceSettingsMenu;
