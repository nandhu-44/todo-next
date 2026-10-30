"use client";
import { useEffect } from "react";
import { sameAppearance, type Appearance } from "@/lib/appearance";
import { applyAppearance, readAppearanceCookie, writeAppearanceCookie } from "@/lib/appearanceClient";

/** Makes this device follow the account's saved appearance (e.g. after it was changed on another device). */
export default function AppearanceSync({ appearance }: { appearance: Appearance }) {
  useEffect(() => {
    const here = readAppearanceCookie();
    if (!here || !sameAppearance(here, appearance)) {
      applyAppearance(appearance);
      writeAppearanceCookie(appearance);
    }
  }, [appearance]);
  return null;
}
