import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import Background from "@/components/Background";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "ToDo Next",
  description: "A beautiful, fast todo app with priorities, due dates, tags and more.",
  authors: [{ name: "Nandhu Krishnan A" }],
};
export const viewport: Viewport = { themeColor: "#b5502f", width: "device-width", initialScale: 1 };

// Runs before first paint so the saved theme never flashes. Modes: "light" | "dark" | "system" (default).
// The choice is read from the `theme` cookie (also used by the server), falling back to localStorage.
const themeScript = `(function(){var t=null;try{var m=document.cookie.match(/(?:^|; )theme=(light|dark)/);t=m?m[1]:null}catch(e){}if(!t){try{t=localStorage.getItem('theme')}catch(e){}}var d=t==='dark';if(!t||(t!=='light'&&t!=='dark')){try{d=matchMedia('(prefers-color-scheme: dark)').matches}catch(e){}}document.documentElement.classList.toggle('dark',d)})()`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Server-render the saved theme so the first paint is already correct even if scripts or storage are blocked.
  const saved = (await cookies()).get("theme")?.value;
  return (
    <html lang="en" suppressHydrationWarning className={saved === "dark" ? "dark" : undefined}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Background />
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
