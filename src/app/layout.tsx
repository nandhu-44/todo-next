import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { APPEARANCE_COOKIE, DEFAULT_APPEARANCE, accentHexes, appearanceCss, iconUrl, parseAppearance, type Appearance } from "@/lib/appearance";
import Background from "@/components/Background";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

/** The device's saved appearance (cookie), or the default. */
async function savedAppearance(): Promise<Appearance> {
  try {
    const raw = (await cookies()).get(APPEARANCE_COOKIE)?.value;
    if (raw) return parseAppearance(JSON.parse(raw));
  } catch {}
  return DEFAULT_APPEARANCE;
}

// The favicon and browser theme colour follow the account's theme.
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "ToDo Next",
    description: "A beautiful, fast todo app with priorities, due dates, tags and more.",
    authors: [{ name: "Nandhu Krishnan A" }],
    icons: { icon: { url: iconUrl(await savedAppearance()), type: "image/svg+xml" } },
  };
}
export async function generateViewport(): Promise<Viewport> {
  const { light, dark } = accentHexes(await savedAppearance());
  return {
    width: "device-width",
    initialScale: 1,
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: light },
      { media: "(prefers-color-scheme: dark)", color: dark },
    ],
  };
}

// Runs before first paint so the saved theme never flashes. Modes: "light" | "dark" | "system" (default).
// The choice is read from the `theme` cookie (also used by the server), falling back to localStorage.
const themeScript = `(function(){var t=null;try{var m=document.cookie.match(/(?:^|; )theme=(light|dark)/);t=m?m[1]:null}catch(e){}if(!t){try{t=localStorage.getItem('theme')}catch(e){}}var d=t==='dark';if(!t||(t!=='light'&&t!=='dark')){try{d=matchMedia('(prefers-color-scheme: dark)').matches}catch(e){}}document.documentElement.classList.toggle('dark',d)})()`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Server-render the saved theme so the first paint is already correct even if scripts or storage are blocked.
  const jar = await cookies();
  // the saved font / theme / radius, rendered into the first HTML so there is no flash
  let css = "";
  try {
    const raw = jar.get(APPEARANCE_COOKIE)?.value;
    if (raw) css = appearanceCss(parseAppearance(JSON.parse(raw)));
  } catch {}
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <style id="appearance" dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>
        <Background />
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
