import ForgotPasswordForm from "@/components/ForgotPasswordForm";
import { captchaConfig } from "@/lib/captcha";

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm captcha={captchaConfig()} />;
}
