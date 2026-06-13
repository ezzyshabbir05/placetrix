import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IconLayoutNavbar,
  IconCode,
  IconKeyboard,
  IconAdjustments,
  IconFlask,
  IconClock,
  IconX,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export type IdeSettings = {
  fontSize: number;
  wordWrap: "on" | "off";
  buttonPosition: "toolbar" | "bottom";
};

export const DEFAULT_IDE_SETTINGS: IdeSettings = {
  fontSize: 13,
  wordWrap: "on",
  buttonPosition: "bottom",
};

interface IdeSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: IdeSettings;
  onSettingsChange: (settings: IdeSettings) => void;
  onPreviewFontSize?: (size: number) => void;
  trigger?: React.ReactNode;
}

export function IdeSettingsModal({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  onPreviewFontSize,
  trigger,
}: IdeSettingsModalProps) {
  const safeSettings = { ...DEFAULT_IDE_SETTINGS, ...settings };

  const savedFontSizeRef = React.useRef(safeSettings.fontSize);
  const [isFontSelectOpen, setIsFontSelectOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isFontSelectOpen) {
      savedFontSizeRef.current = safeSettings.fontSize;
    }
  }, [safeSettings.fontSize, isFontSelectOpen]);

  const updateSetting = <K extends keyof IdeSettings>(
    key: K,
    value: IdeSettings[K]
  ) => {
    onSettingsChange({ ...safeSettings, [key]: value });
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent 
        className="w-[400px] p-0 gap-0 overflow-hidden bg-zinc-950 border-zinc-800 text-zinc-100 flex flex-col z-[99999]" 
        align="end"
        sideOffset={8}
      >
        <Tabs defaultValue="dynamic-layout" className="flex flex-col w-full">
          {/* Header & TabsList */}
          <div className="p-4 border-b border-zinc-800 bg-zinc-900/30">
            <h2 className="text-lg font-bold tracking-tight mb-3">Settings</h2>
            <TabsList className="grid w-full grid-cols-2 bg-zinc-950 border border-zinc-800 text-zinc-400 p-1">
              <TabsTrigger 
                value="dynamic-layout" 
                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white rounded-sm text-xs py-1.5"
              >
                Layout
              </TabsTrigger>
              <TabsTrigger 
                value="code-editor" 
                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white rounded-sm text-xs py-1.5"
              >
                Editor
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Content Area */}
          <div className="p-4 max-h-[320px] overflow-y-auto">
            
            {/* Dynamic Layout Tab */}
            <TabsContent value="dynamic-layout" className="m-0 space-y-4 animate-in fade-in-50">
              <div className="space-y-3">
                <Label className="text-sm text-zinc-300 font-medium">Action Buttons Position</Label>
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* ToolBar Option */}
                  <button
                    onClick={() => updateSetting("buttonPosition", "toolbar")}
                    className={cn(
                      "group flex flex-col items-center gap-2 outline-none",
                    )}
                  >
                    <div className={cn(
                      "w-full h-20 rounded-md border p-1.5 flex flex-col gap-1 transition-all",
                      safeSettings.buttonPosition === "toolbar" 
                        ? "border-emerald-500 bg-emerald-500/5" 
                        : "border-zinc-800 bg-zinc-900/50 group-hover:border-zinc-600"
                    )}>
                      {/* Fake Toolbar with buttons */}
                      <div className="w-full h-3 flex justify-between items-center px-1">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                        </div>
                        <div className={cn(
                          "w-6 h-1.5 rounded bg-zinc-700",
                          safeSettings.buttonPosition === "toolbar" && "bg-emerald-500/80"
                        )} />
                      </div>
                      {/* Fake Editor & Output */}
                      <div className="flex gap-1 flex-1">
                        <div className="flex-1 bg-zinc-800/50 rounded-sm" />
                        <div className="flex-1 bg-zinc-800/50 rounded-sm" />
                      </div>
                    </div>
                    <span className={cn(
                      "text-xs font-medium",
                      safeSettings.buttonPosition === "toolbar" ? "text-emerald-500" : "text-zinc-400 group-hover:text-zinc-300"
                    )}>ToolBar</span>
                  </button>

                  {/* Code Editor Option */}
                  <button
                    onClick={() => updateSetting("buttonPosition", "bottom")}
                    className={cn(
                      "group flex flex-col items-center gap-2 outline-none",
                    )}
                  >
                    <div className={cn(
                      "w-full h-20 rounded-md border p-1.5 flex flex-col gap-1 transition-all",
                      safeSettings.buttonPosition === "bottom" 
                        ? "border-emerald-500 bg-emerald-500/5" 
                        : "border-zinc-800 bg-zinc-900/50 group-hover:border-zinc-600"
                    )}>
                      <div className="w-full h-3 flex justify-between items-center px-1">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                        </div>
                      </div>
                      {/* Fake Editor & Output */}
                      <div className="flex gap-1 flex-1 relative">
                        <div className="w-full bg-zinc-800/50 rounded-sm" />
                        {/* Fake bottom bar */}
                        <div className="absolute bottom-1 right-1 left-1 h-2 rounded-sm flex justify-end px-1 items-center">
                          <div className={cn(
                            "w-5 h-1.5 rounded-sm bg-zinc-700",
                            safeSettings.buttonPosition === "bottom" && "bg-emerald-500/80"
                          )} />
                        </div>
                      </div>
                    </div>
                    <span className={cn(
                      "text-xs font-medium",
                      safeSettings.buttonPosition === "bottom" ? "text-emerald-500" : "text-zinc-400 group-hover:text-zinc-300"
                    )}>Code Editor</span>
                  </button>
                </div>
              </div>
            </TabsContent>

            {/* Code Editor Tab */}
            <TabsContent value="code-editor" className="m-0 space-y-5 animate-in fade-in-50">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-zinc-300">Font Size</Label>
                  <p className="text-xs text-zinc-500 mt-0.5">Adjust the editor's font size</p>
                </div>
                <Select 
                  value={(safeSettings.fontSize || 13).toString()} 
                  onValueChange={(v) => {
                    const size = parseInt(v, 10);
                    savedFontSizeRef.current = size;
                    updateSetting("fontSize", size);
                  }}
                  onOpenChange={(open) => {
                    setIsFontSelectOpen(open);
                    if (open) {
                      savedFontSizeRef.current = safeSettings.fontSize;
                    } else {
                      // Revert if closed without selection by directly updating monaco via callback
                      if (onPreviewFontSize) {
                        onPreviewFontSize(savedFontSizeRef.current);
                      }
                    }
                  }}
                >
                  <SelectTrigger className="w-24 h-8 bg-zinc-950 border-zinc-800 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" className="bg-zinc-950 border-zinc-800 text-zinc-200">
                    {[12, 13, 14, 15, 16, 17, 18, 19, 20].map((size) => (
                      <SelectItem 
                        key={size} 
                        value={size.toString()}
                        onPointerEnter={() => {
                          if (onPreviewFontSize) onPreviewFontSize(size);
                        }}
                        onFocus={() => {
                          if (onPreviewFontSize) onPreviewFontSize(size);
                        }}
                      >
                        {size}px
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-zinc-300">Word Wrap</Label>
                  <p className="text-xs text-zinc-500 mt-0.5">Wrap lines exceeding editor width</p>
                </div>
                <Switch 
                  checked={safeSettings.wordWrap === "on"}
                  onCheckedChange={(c) => updateSetting("wordWrap", c ? "on" : "off")}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
