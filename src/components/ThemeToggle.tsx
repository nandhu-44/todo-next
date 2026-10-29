"use client";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

type Theme = "light" | "dark" | "system";
const KEY = "theme";
const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const stored = (): Theme => {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
};
const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
const apply = (t: Theme) => document.documentElement.classList.toggle("dark", t === "dark" || (t === "system" && prefersDark()));

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  // Read the saved choice after mount (the inline script has already applied it to <html>).
  useEffect(() => {
    setTheme(stored());
    setMounted(true);
  }, []);

  // Follow OS changes while in "system" mode, and stay in sync with other tabs.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onOs = () => theme === "system" && apply("system");
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      const t = stored();
      setTheme(t);
      apply(t);
    };
    mq.addEventListener("change", onOs);
    window.addEventListener("storage", onStorage);
    return () => {
      mq.removeEventListener("change", onOs);
      window.removeEventListener("storage", onStorage);
    };
  }, [theme]);

  const choose = useCallback((t: Theme) => {
    setTheme(t);
    apply(t);
    try {
      if (t === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, t);
    } catch {}
  }, []);

  const Current = OPTIONS.find((o) => o.value === theme)!.icon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Theme" title="Theme">
          {/* before mount we don't know the saved mode, so show a neutral icon to avoid a flash of the wrong one */}
          {mounted ? <Current className="!size-5" /> : <Monitor className="!size-5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-36">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem key={value} onSelect={() => choose(value)}>
            <Icon /> {label}
            {theme === value && <Check className="ml-auto text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
