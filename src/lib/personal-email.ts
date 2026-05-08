/**
 * Personal-email detection for org-only flows.
 *
 * Used by:
 *  - /sign-up org form (block personal emails at signup)
 *  - /headhunting/client/hire/new in-flow signup
 *  - /services request dialog (when guests are blocked, this is the warning copy)
 *
 * The list covers the major free-mail providers worldwide. It is intentionally
 * conservative — when in doubt, allow. We can extend the list as needed.
 */
const PERSONAL_EMAIL_DOMAINS = new Set<string>([
  // Global mainstream
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.co.in",
  "yahoo.com.au",
  "yahoo.com.br",
  "yahoo.fr",
  "yahoo.de",
  "ymail.com",
  "rocketmail.com",
  "outlook.com",
  "hotmail.com",
  "hotmail.co.uk",
  "hotmail.fr",
  "live.com",
  "live.co.uk",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "aim.com",
  // Privacy / alt
  "protonmail.com",
  "proton.me",
  "pm.me",
  "tutanota.com",
  "tutanota.de",
  "tuta.io",
  "fastmail.com",
  "fastmail.fm",
  "hey.com",
  "hushmail.com",
  "mail.com",
  "email.com",
  "gmx.com",
  "gmx.us",
  "gmx.net",
  "gmx.de",
  // Regional
  "yandex.com",
  "yandex.ru",
  "ya.ru",
  "qq.com",
  "163.com",
  "126.com",
  "sina.com",
  "sina.cn",
  "naver.com",
  "daum.net",
  "rediffmail.com",
  "zoho.com",
  // Bangladesh-relevant freemail
  "bd.com",
]);

export function isPersonalEmail(email: string): boolean {
  if (!email) return false;
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 0 || at === trimmed.length - 1) return false;
  const domain = trimmed.slice(at + 1);
  return PERSONAL_EMAIL_DOMAINS.has(domain);
}

export const PERSONAL_EMAIL_WARNING =
  "Please use your company email — personal email providers (Gmail, Yahoo, Outlook, etc.) are not eligible for organization accounts.";
