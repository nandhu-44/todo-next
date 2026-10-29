import SignInForm from "@/components/SignInForm";
import { googleEnabled } from "@/lib/google";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <SignInForm googleEnabled={googleEnabled()} initialError={error} />;
}
