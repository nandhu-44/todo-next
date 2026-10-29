import { redirect } from "next/navigation";
import SettingsView from "@/components/SettingsView";
import { getUser, toPublic } from "@/lib/auth";
import { googleEnabled } from "@/lib/google";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) redirect("/signin");
  return <SettingsView initial={toPublic(user)} googleEnabled={googleEnabled()} />;
}
