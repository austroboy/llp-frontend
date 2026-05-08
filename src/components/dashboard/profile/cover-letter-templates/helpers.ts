export function formatToday(): string {
  const d = new Date();
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function buildContactParts(profile: {
  email: string;
  phone?: string;
  city?: string;
  country?: string;
  linkedin?: string;
  portfolio?: string;
}): string[] {
  const parts: string[] = [];
  if (profile.email) parts.push(profile.email);
  if (profile.phone) parts.push(profile.phone);
  const loc = [profile.city, profile.country].filter(Boolean).join(", ");
  if (loc) parts.push(loc);
  if (profile.linkedin) parts.push(profile.linkedin);
  if (profile.portfolio) parts.push(profile.portfolio);
  return parts;
}
