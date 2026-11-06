import SignUpForm from "@/components/SignUpForm";
import { captchaConfig } from "@/lib/captcha";
import { googleEnabled } from "@/lib/google";

export default function SignUpPage() {
  return <SignUpForm googleEnabled={googleEnabled()} captcha={captchaConfig()} />;
}
