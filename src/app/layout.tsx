import type { Metadata, Viewport } from "next";
import Background from "@/components/Background";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "ToDo App",
  description: "A beautiful, fast todo app with priorities, due dates, tags and more.",
  authors: [{ name: "Nandhu Krishnan A" }],
};
export const viewport: Viewport = { themeColor: "#b5502f", width: "device-width", initialScale: 1 };

// Runs before paint so the saved theme never flashes.
const themeScript = `try{var t=localStorage.getItem('theme');if(t!=='light')document.documentElement.classList.add('dark')}catch(e){document.documentElement.classList.add('dark')}`;

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
