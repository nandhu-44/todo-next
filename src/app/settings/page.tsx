import { redirect } from "next/navigation";
import SettingsView from "@/components/SettingsView";
import { getUser, toPublic } from "@/lib/auth";
import { googleEnabled } from "@/lib/google";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; linked?: string }> }) {
  const { error, linked } = await searchParams;
  const user = await getUser();
  if (!user) redirect("/signin");
  return <SettingsView initial={toPublic(user)} googleEnabled={googleEnabled()} error={error} linked={linked === "1"} />;
}
