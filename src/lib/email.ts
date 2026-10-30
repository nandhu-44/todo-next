/**
 * The canonical form of an email address — our account key.
 * Lower-cases, and for Gmail strips dots and "+tags" (john.doe+x@gmail.com == johndoe@gmail.com),
 * so the same inbox can never end up as two accounts.
 */
export function normalizeEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1) return email;
  let local = email.slice(0, at);
  let domain = email.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    domain = "gmail.com";
    local = local.split("+")[0].replace(/\./g, "");
  }
  return `${local}@${domain}`;
}

export const isEmail = (s: string) => /^\S+@\S+\.\S+$/.test(s);
