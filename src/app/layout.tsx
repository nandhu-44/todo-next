import type { Metadata, Viewport } from "next";
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
const themeScript = `(function(){var d=false;try{var t=localStorage.getItem('theme');d=t==='dark'||((t!=='light')&&window.matchMedia('(prefers-color-scheme: dark)').matches)}catch(e){}document.documentElement.classList.toggle('dark',d)})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
