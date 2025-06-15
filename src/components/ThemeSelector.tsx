import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { Monitor, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const themeOptions = [
  { value: "system", label: "System Default", icon: Monitor, description: "Follow system theme" },
  { value: "light", label: "Light", icon: Sun, description: "Clean light theme" },
  { value: "dark", label: "Dark", icon: Moon, description: "Dark theme" },
];

interface ThemeSelectorProps {
  variant?: "full" | "compact";
  className?: string;
}

export const ThemeSelector = ({ variant = "full", className = "" }: ThemeSelectorProps) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render on server-side
  if (!mounted) {
    return null;
  }

  const currentTheme = themeOptions.find(t => t.value === theme) || themeOptions[0];
  const CurrentIcon = currentTheme.icon;

  if (variant === "compact") {
    return (
      <div className={`flex items-center justify-between ${className}`}>
        <span className="font-medium">Theme Mode</span>
        <Select value={theme} onValueChange={setTheme}>
          <SelectTrigger className="w-[140px] h-7 text-xs">
            <SelectValue placeholder="Select theme" />
          </SelectTrigger>
          <SelectContent>
            {themeOptions.map((themeOption) => {
              const IconComponent = themeOption.icon;
              return (
                <SelectItem key={themeOption.value} value={themeOption.value}>
                  <div className="flex items-center space-x-2">
                    <IconComponent className="h-3 w-3" />
                    <span>{themeOption.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CurrentIcon className="h-4 w-4" />
          <span className="font-medium">Theme Selection</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const currentIndex = themeOptions.findIndex(t => t.value === theme);
            const nextIndex = (currentIndex + 1) % themeOptions.length;
            setTheme(themeOptions[nextIndex].value);
          }}
          className="text-xs"
        >
          Toggle Theme
        </Button>
      </div>
      
      <Select value={theme} onValueChange={setTheme}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select theme" />
        </SelectTrigger>
        <SelectContent>
          {themeOptions.map((themeOption) => {
            const IconComponent = themeOption.icon;
            return (
              <SelectItem key={themeOption.value} value={themeOption.value}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    <IconComponent className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{themeOption.label}</div>
                      <div className="text-xs text-muted-foreground">{themeOption.description}</div>
                    </div>
                  </div>
                  {theme === themeOption.value && (
                    <div className="ml-2 h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      
      <div className="text-xs text-muted-foreground p-2 bg-muted/20 rounded">
        <strong>Current:</strong> {currentTheme.label} - {currentTheme.description}
      </div>
    </div>
  );
};
