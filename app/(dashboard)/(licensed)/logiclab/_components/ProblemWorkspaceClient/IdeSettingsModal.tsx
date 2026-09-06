import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { IdeSettings } from "../../_types";
import { DEFAULT_IDE_SETTINGS } from "../../_constants";

interface IdeSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: IdeSettings;
  onSettingsChange: (settings: IdeSettings) => void;
  onPreviewFontSize?: (size: number) => void;
  onOpenShortcuts?: () => void;
  trigger?: React.ReactNode;
}

export function IdeSettingsModal({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  onPreviewFontSize,
  onOpenShortcuts,
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
        className="w-96 p-0 gap-0 overflow-hidden flex flex-col z-9999" 
        align="end"
        sideOffset={8}
      >
        <Tabs defaultValue="dynamic-layout" className="flex flex-col w-full">
          {/* Header & TabsList */}
          <div className="p-4 border-b border-border bg-muted/20">
            <h2 className="text-sm font-bold tracking-tight text-foreground mb-3">Settings</h2>
            <TabsList className="grid w-full grid-cols-2 p-1">
              <TabsTrigger 
                value="dynamic-layout" 
                className="text-xs py-1.5 font-semibold"
              >
                Layout
              </TabsTrigger>
              <TabsTrigger 
                value="code-editor" 
                className="text-xs py-1.5 font-semibold"
              >
                Editor
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Content Area */}
          <div className="p-4 max-h-80 overflow-y-auto">
            
            {/* Dynamic Layout Tab */}
            <TabsContent value="dynamic-layout" className="m-0 space-y-4 animate-in fade-in-50">
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Action Buttons Position
                </Label>
                <RadioGroup
                  value={safeSettings.buttonPosition}
                  onValueChange={(val) => updateSetting("buttonPosition", val as "toolbar" | "bottom")}
                  className="grid grid-cols-2 gap-3"
                >
                  {/* ToolBar Option */}
                  <label
                    htmlFor="btn-pos-toolbar"
                    className={cn(
                      "flex flex-col items-start gap-2.5 p-3 rounded-xl border text-left cursor-pointer transition-all",
                      safeSettings.buttonPosition === "toolbar"
                        ? "border-primary bg-primary/5 shadow-xs"
                        : "border-border/70 bg-card hover:bg-muted/40 hover:border-border"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <RadioGroupItem value="toolbar" id="btn-pos-toolbar" />
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">Top</span>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-foreground block">Navbar Toolbar</span>
                      <span className="text-[11px] text-muted-foreground leading-tight block mt-0.5">
                        Centered in top header
                      </span>
                    </div>
                  </label>

                  {/* Code Editor Bottom Option */}
                  <label
                    htmlFor="btn-pos-bottom"
                    className={cn(
                      "flex flex-col items-start gap-2.5 p-3 rounded-xl border text-left cursor-pointer transition-all",
                      safeSettings.buttonPosition === "bottom"
                        ? "border-primary bg-primary/5 shadow-xs"
                        : "border-border/70 bg-card hover:bg-muted/40 hover:border-border"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <RadioGroupItem value="bottom" id="btn-pos-bottom" />
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">Bottom</span>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-foreground block">Editor Footer</span>
                      <span className="text-[11px] text-muted-foreground leading-tight block mt-0.5">
                        Floating at code bottom
                      </span>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            </TabsContent>

            {/* Code Editor Tab */}
            <TabsContent value="code-editor" className="m-0 space-y-4 animate-in fade-in-50">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold text-foreground">Font Size</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Adjust editor typography scale</p>
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
                      if (onPreviewFontSize) {
                        onPreviewFontSize(savedFontSizeRef.current);
                      }
                    }
                  }}
                >
                  <SelectTrigger size="sm" className="w-24 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-100000 min-w-24">
                    {[12, 13, 14, 15, 16, 17, 18, 19, 20].map((size) => (
                      <SelectItem 
                        key={size} 
                        value={size.toString()}
                        className="text-xs font-medium cursor-pointer"
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
                  <Label className="text-xs font-semibold text-foreground">Word Wrap</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Wrap lines exceeding viewport width</p>
                </div>
                <Switch 
                  checked={safeSettings.wordWrap === "on"}
                  onCheckedChange={(c) => updateSetting("wordWrap", c ? "on" : "off")}
                />
              </div>

              <div 
                className="flex items-center justify-between cursor-pointer group py-2 px-2.5 rounded-lg border border-border/60 hover:bg-muted/40 transition-colors"
                onClick={() => {
                  if (onOpenShortcuts) onOpenShortcuts();
                  onOpenChange(false);
                }}
              >
                <div>
                  <Label className="text-xs font-semibold text-foreground cursor-pointer">Keyboard Shortcuts</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">View all editor shortcuts</p>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground group-hover:text-foreground transition-colors">
                  <span className="text-xs font-medium">View</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
