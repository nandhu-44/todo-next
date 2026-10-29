import type { Metadata, Viewport } from "next";
import Background from "@/components/Background";
import { ToastProvider } from "@/components/Toasts";
import "./globals.css";

export const metadata: Metadata = {
  title: "ToDo App",
  description: "A beautiful, fast todo app with priorities, due dates, tags and more.",
  icons: { icon: "/checkmark.png" },
  authors: [{ name: "Nandhu Krishnan A" }],
};
export const viewport: Viewport = { themeColor: "#7dd3fc", width: "device-width", initialScale: 1 };

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
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
