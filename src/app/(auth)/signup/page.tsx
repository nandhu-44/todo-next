import SignUpForm from "@/components/SignUpForm";
import { googleEnabled } from "@/lib/google";

export default function SignUpPage() {
  return <SignUpForm googleEnabled={googleEnabled()} />;
}
