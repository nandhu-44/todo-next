"use client";
import { Check, Loader2, Palette, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  DEFAULT_APPEARANCE, FONTS, PRESETS, PRESET_IDS, parseAppearance, sameAppearance, themeParams, tokens,
  type Appearance, type PresetId, type ThemeParams,
} from "@/lib/appearance";
import { applyAppearance } from "@/lib/appearanceClient";
import { notify } from "@/lib/notify";
import type { PublicUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Section } from "./SettingsSection";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

/** Tracks whether the page is in dark mode (toggled elsewhere), so previews show the right palette. */
function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setDark(el.classList.contains("dark"));
    read();
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return dark;
}

export default function AppearanceSettings({ initial }: { initial: Appearance }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const dirty = !sameAppearance(draft, saved);
  const dark = useIsDark();

  // Live preview: the whole app restyles as you tweak. Leaving the page without saving restores the saved look.
  useEffect(() => applyAppearance(draft), [draft]);
  useEffect(() => () => applyAppearance(savedRef.current), []);

  const set = (patch: Partial<Appearance>) => setDraft((d) => ({ ...d, ...patch }));
  const setCustom = (patch: Partial<ThemeParams>) => setDraft((d) => ({ ...d, theme: "custom", custom: { ...d.custom, ...patch } }));

  async function save() {
    setSaving(true);
    try {
      const r = await api<{ user: PublicUser }>("/api/account/appearance", { method: "PUT", body: draft });
      setSaved(r.user.appearance);
      setDraft(r.user.appearance);
      notify.success("Appearance saved to your account");
    } catch (err) {
      notify.error((err as Error).message);
    }
    setSaving(false);
  }

  const params = themeParams(draft);

  return (
    <Section icon={Palette} title="Appearance" description="Font, colours and corners. Changes preview instantly and are saved to your account, so they follow you to other devices.">
      <div className="space-y-6">
        {/* ---------- font ---------- */}
        <div className="space-y-2">
          <Label>Font</Label>
          <div role="radiogroup" aria-label="Font" className="grid gap-2 sm:grid-cols-2">
            {FONTS.map((f) => {
              const on = draft.font === f.id;
              return (
                <button
                  key={f.id}
                  role="radio"
                  aria-checked={on}
                  onClick={() => set({ font: f.id })}
                  className={cn("relative rounded-xl border p-3 text-left outline-none transition focus-visible:ring-4 focus-visible:ring-primary/25", on ? "border-primary bg-primary/8" : "border-border hover:bg-muted/60")}
                >
                  {on && <Check className="absolute right-3 top-3 size-4 text-primary" />}
                  <span className="block text-lg leading-tight" style={{ fontFamily: f.heading, fontWeight: f.weight, letterSpacing: f.tracking }}>Renew car insurance</span>
                  <span className="mt-1 block text-xs text-muted-foreground" style={{ fontFamily: f.body }}>Compare quotes from two providers before the 15th</span>
                  <span className="mt-2 block text-[11px] font-medium text-foreground/70">{f.name}{f.id === DEFAULT_APPEARANCE.font ? " · default" : ""}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ---------- theme ---------- */}
        <div className="space-y-2">
          <Label>Colour theme</Label>
          <div role="radiogroup" aria-label="Colour theme" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PRESET_IDS.map((id) => (
              <ThemeCard key={id} name={PRESETS[id].name} note={PRESETS[id].note} params={PRESETS[id]} dark={dark} on={draft.theme === id} onSelect={() => set({ theme: id })} />
            ))}
            <ThemeCard
              name="Custom"
              note="Build your own"
              params={draft.custom}
              dark={dark}
              on={draft.theme === "custom"}
              // start customising from whatever theme you're looking at
              onSelect={() => setDraft((d) => ({ ...d, theme: "custom", custom: d.theme === "custom" ? d.custom : { ...themeParams(d) } }))}
            />
          </div>

          {draft.theme === "custom" && (
            <div className="space-y-4 rounded-xl border border-border bg-muted/40 p-4">
              <div className="space-y-1.5">
                <Label htmlFor="accent">Accent colour</Label>
                <div className="flex items-center gap-2">
                  <input id="accent" type="color" value={params.accent} onChange={(e) => setCustom({ accent: e.target.value.toLowerCase() })} className="size-10 cursor-pointer rounded-lg border border-border bg-transparent p-0.5" aria-label="Accent colour" />
                  <Input
                    value={params.accent}
                    onChange={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && setCustom({ accent: e.target.value.toLowerCase() })}
                    onBlur={(e) => (e.target.value = params.accent)}
                    key={params.accent}
                    defaultValue={params.accent}
                    spellCheck={false}
                    maxLength={7}
                    className="w-32 font-mono"
                    aria-label="Accent colour hex"
                  />
                  <span className="text-xs text-muted-foreground">Text on it is adjusted automatically to stay readable.</span>
                </div>
              </div>
              <Slider label="Background tint" value={params.hue} min={0} max={360} suffix="°" onChange={(hue) => setCustom({ hue })}
                track={`linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360].map((h) => `hsl(${h} 60% 70%)`).join(",")})`} />
              <Slider label="Tint strength" value={params.tint} min={0} max={40} suffix="" onChange={(tint) => setCustom({ tint })} track="linear-gradient(to right, hsl(0 0% 94%), hsl(var(--primary) / 0.35))" />
            </div>
          )}
        </div>

        {/* ---------- radius ---------- */}
        <div className="rounded-xl border border-border p-4">
          <Slider label="Corner roundness" value={draft.radius} min={0} max={20} suffix="px" onChange={(radius) => set({ radius })} track="linear-gradient(to right, hsl(var(--muted)), hsl(var(--muted)))" />
        </div>

        {/* ---------- actions ---------- */}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={save} disabled={!dirty || saving}>{saving && <Loader2 className="animate-spin" />} Save appearance</Button>
          <Button variant="secondary" disabled={!dirty || saving} onClick={() => setDraft(saved)}>Discard changes</Button>
          <Button variant="ghost" disabled={saving || sameAppearance(draft, DEFAULT_APPEARANCE)} onClick={() => setDraft(parseAppearance(DEFAULT_APPEARANCE))}><RotateCcw /> Reset to default</Button>
          {dirty && <span className="text-xs text-muted-foreground">Unsaved changes. This is a preview until you save.</span>}
        </div>
      </div>
    </Section>
  );
}

function ThemeCard({ name, note, params, dark, on, onSelect }: { name: string; note: string; params: ThemeParams; dark: boolean; on: boolean; onSelect: () => void }) {
  const t = tokens(params, dark);
  const c = (k: string, a?: number) => `hsl(${t[k]}${a !== undefined ? ` / ${a}` : ""})`;
  return (
    <button
      role="radio"
      aria-checked={on}
      onClick={onSelect}
      className={cn("rounded-xl border p-2 text-left outline-none transition focus-visible:ring-4 focus-visible:ring-primary/25", on ? "border-primary ring-2 ring-primary/30" : "border-border hover:bg-muted/60")}
    >
      {/* miniature of the app in this theme's palette */}
      <span className="block rounded-lg p-2" style={{ background: c("--background") }}>
        <span className="block rounded-md border p-1.5" style={{ background: c("--card"), borderColor: c("--border") }}>
          <span className="block h-1.5 w-2/3 rounded-full" style={{ background: c("--foreground") }} />
          <span className="mt-1 block h-1 w-1/2 rounded-full" style={{ background: c("--muted-foreground", 0.5) }} />
          <span className="mt-1.5 flex items-center gap-1">
            <span className="h-3.5 w-9 rounded" style={{ background: c("--primary") }} />
            <span className="h-3.5 w-5 rounded" style={{ background: c("--muted") }} />
          </span>
        </span>
      </span>
      <span className="mt-1.5 flex items-center justify-between px-0.5">
        <span className="text-sm font-medium">{name}</span>
        {on && <Check className="size-4 text-primary" />}
      </span>
      <span className="block px-0.5 text-[11px] text-muted-foreground">{note}</span>
    </button>
  );
}

function Slider({ label, value, min, max, suffix, onChange, track }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (v: number) => void; track: string }) {
  const id = label.replace(/\s/g, "-").toLowerCase();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">{value}{suffix}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider"
        style={{ background: track }}
      />
    </div>
  );
}
