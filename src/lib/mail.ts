import nodemailer from "nodemailer";

/** Sends the reset email. Returns false when SMTP isn't configured (link is logged instead). */
export async function sendResetMail(to: string, link: string): Promise<boolean> {
  if (!process.env.SMTP_HOST) {
    console.log(`\n[todo-next] Password reset link for ${to}:\n${link}\n`);
    return false;
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  await transport.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "Reset your ToDo App password",
    html: `<p>Click the link below to choose a new password. It expires in 1 hour.</p><p><a href="${link}">${link}</a></p>`,
  });
  return true;
}
