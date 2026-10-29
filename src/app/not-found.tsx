import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Compass className="size-16 text-primary" />
      <h1 className="font-supercell text-6xl tracking-wide text-primary ">404</h1>
      <p className="text-muted-foreground">Looks like you&apos;re lost. That page doesn&apos;t exist.</p>
      <Button asChild><Link href="/">Take me home</Link></Button>
    </main>
  );
}
