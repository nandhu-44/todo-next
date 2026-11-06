import { redirect } from "next/navigation";
import SettingsView from "@/components/SettingsView";
import { getSessionUserId, toPublic } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { googleEnabled } from "@/lib/google";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; linked?: string }> }) {
  const { error, linked } = await searchParams;
  const id = await getSessionUserId();
  if (!id) redirect("/signin");
  const db = await getDb();
  // the account and its passkey count are independent, so they load in parallel
  const [user, passkeyCount] = await Promise.all([db.users.findOne({ id }), db.passkeys.count({ userId: id })]);
  if (!user) redirect("/signin");
  return <SettingsView initial={toPublic(user)} passkeyCount={passkeyCount} googleEnabled={googleEnabled()} error={error} linked={linked === "1"} />;
}
