import { redirect } from "next/navigation";
import TwoFactorForm from "@/components/TwoFactorForm";
import { readPending } from "@/lib/auth";

export default async function TwoFactorPage() {
  if (!(await readPending())) redirect("/signin");
  return <TwoFactorForm />;
}
