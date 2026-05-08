// ============================================================
// Profile constants — Bangladesh location & experience labels
// (Carved out of the deleted src/lib/jobs/constants.ts so the
// profile wizard, editor, and public profile keep working after
// the jobs feature was ripped.)
// ============================================================

export const DIVISIONS: { value: string; en: string; bn: string }[] = [
  { value: "Dhaka", en: "Dhaka", bn: "ঢাকা" },
  { value: "Chattogram", en: "Chattogram", bn: "চট্টগ্রাম" },
  { value: "Rajshahi", en: "Rajshahi", bn: "রাজশাহী" },
  { value: "Khulna", en: "Khulna", bn: "খুলনা" },
  { value: "Barishal", en: "Barishal", bn: "বরিশাল" },
  { value: "Sylhet", en: "Sylhet", bn: "সিলেট" },
  { value: "Rangpur", en: "Rangpur", bn: "রংপুর" },
  { value: "Mymensingh", en: "Mymensingh", bn: "ময়মনসিংহ" },
];

export const DISTRICTS: Record<string, { value: string; en: string; bn: string }[]> = {
  Dhaka: [
    { value: "Dhaka", en: "Dhaka", bn: "ঢাকা" },
    { value: "Gazipur", en: "Gazipur", bn: "গাজীপুর" },
    { value: "Narayanganj", en: "Narayanganj", bn: "নারায়ণগঞ্জ" },
    { value: "Tangail", en: "Tangail", bn: "টাঙ্গাইল" },
    { value: "Narsingdi", en: "Narsingdi", bn: "নরসিংদী" },
    { value: "Manikganj", en: "Manikganj", bn: "মানিকগঞ্জ" },
    { value: "Munshiganj", en: "Munshiganj", bn: "মুন্সীগঞ্জ" },
    { value: "Madaripur", en: "Madaripur", bn: "মাদারীপুর" },
    { value: "Gopalganj", en: "Gopalganj", bn: "গোপালগঞ্জ" },
    { value: "Faridpur", en: "Faridpur", bn: "ফরিদপুর" },
    { value: "Rajbari", en: "Rajbari", bn: "রাজবাড়ী" },
    { value: "Shariatpur", en: "Shariatpur", bn: "শরীয়তপুর" },
    { value: "Kishoreganj", en: "Kishoreganj", bn: "কিশোরগঞ্জ" },
  ],
  Chattogram: [
    { value: "Chattogram", en: "Chattogram", bn: "চট্টগ্রাম" },
    { value: "Comilla", en: "Comilla", bn: "কুমিল্লা" },
    { value: "Cox's Bazar", en: "Cox's Bazar", bn: "কক্সবাজার" },
    { value: "Feni", en: "Feni", bn: "ফেনী" },
    { value: "Noakhali", en: "Noakhali", bn: "নোয়াখালী" },
    { value: "Lakshmipur", en: "Lakshmipur", bn: "লক্ষ্মীপুর" },
    { value: "Chandpur", en: "Chandpur", bn: "চাঁদপুর" },
    { value: "Brahmanbaria", en: "Brahmanbaria", bn: "ব্রাহ্মণবাড়িয়া" },
    { value: "Rangamati", en: "Rangamati", bn: "রাঙ্গামাটি" },
    { value: "Khagrachhari", en: "Khagrachhari", bn: "খাগড়াছড়ি" },
    { value: "Bandarban", en: "Bandarban", bn: "বান্দরবান" },
  ],
  Rajshahi: [
    { value: "Rajshahi", en: "Rajshahi", bn: "রাজশাহী" },
    { value: "Bogura", en: "Bogura", bn: "বগুড়া" },
    { value: "Pabna", en: "Pabna", bn: "পাবনা" },
    { value: "Natore", en: "Natore", bn: "নাটোর" },
    { value: "Naogaon", en: "Naogaon", bn: "নওগাঁ" },
    { value: "Chapainawabganj", en: "Chapainawabganj", bn: "চাঁপাইনবাবগঞ্জ" },
    { value: "Joypurhat", en: "Joypurhat", bn: "জয়পুরহাট" },
    { value: "Sirajganj", en: "Sirajganj", bn: "সিরাজগঞ্জ" },
  ],
  Khulna: [
    { value: "Khulna", en: "Khulna", bn: "খুলনা" },
    { value: "Jessore", en: "Jessore", bn: "যশোর" },
    { value: "Satkhira", en: "Satkhira", bn: "সাতক্ষীরা" },
    { value: "Bagerhat", en: "Bagerhat", bn: "বাগেরহাট" },
    { value: "Narail", en: "Narail", bn: "নড়াইল" },
    { value: "Kushtia", en: "Kushtia", bn: "কুষ্টিয়া" },
    { value: "Meherpur", en: "Meherpur", bn: "মেহেরপুর" },
    { value: "Chuadanga", en: "Chuadanga", bn: "চুয়াডাঙ্গা" },
    { value: "Jhenaidah", en: "Jhenaidah", bn: "ঝিনাইদহ" },
    { value: "Magura", en: "Magura", bn: "মাগুরা" },
  ],
  Barishal: [
    { value: "Barishal", en: "Barishal", bn: "বরিশাল" },
    { value: "Bhola", en: "Bhola", bn: "ভোলা" },
    { value: "Patuakhali", en: "Patuakhali", bn: "পটুয়াখালী" },
    { value: "Pirojpur", en: "Pirojpur", bn: "পিরোজপুর" },
    { value: "Barguna", en: "Barguna", bn: "বরগুনা" },
    { value: "Jhalokati", en: "Jhalokati", bn: "ঝালকাঠি" },
  ],
  Sylhet: [
    { value: "Sylhet", en: "Sylhet", bn: "সিলেট" },
    { value: "Moulvibazar", en: "Moulvibazar", bn: "মৌলভীবাজার" },
    { value: "Habiganj", en: "Habiganj", bn: "হবিগঞ্জ" },
    { value: "Sunamganj", en: "Sunamganj", bn: "সুনামগঞ্জ" },
  ],
  Rangpur: [
    { value: "Rangpur", en: "Rangpur", bn: "রংপুর" },
    { value: "Dinajpur", en: "Dinajpur", bn: "দিনাজপুর" },
    { value: "Gaibandha", en: "Gaibandha", bn: "গাইবান্ধা" },
    { value: "Kurigram", en: "Kurigram", bn: "কুড়িগ্রাম" },
    { value: "Lalmonirhat", en: "Lalmonirhat", bn: "লালমনিরহাট" },
    { value: "Nilphamari", en: "Nilphamari", bn: "নীলফামারী" },
    { value: "Panchagarh", en: "Panchagarh", bn: "পঞ্চগড়" },
    { value: "Thakurgaon", en: "Thakurgaon", bn: "ঠাকুরগাঁও" },
  ],
  Mymensingh: [
    { value: "Mymensingh", en: "Mymensingh", bn: "ময়মনসিংহ" },
    { value: "Jamalpur", en: "Jamalpur", bn: "জামালপুর" },
    { value: "Netrokona", en: "Netrokona", bn: "নেত্রকোনা" },
    { value: "Sherpur", en: "Sherpur", bn: "শেরপুর" },
  ],
};

export const EXPERIENCE_LEVELS: { value: string; en: string; bn: string }[] = [
  { value: "entry", en: "Entry Level", bn: "প্রবেশ পর্যায়" },
  { value: "1_3yr", en: "1-3 Years", bn: "১-৩ বছর" },
  { value: "3_5yr", en: "3-5 Years", bn: "৩-৫ বছর" },
  { value: "5_10yr", en: "5-10 Years", bn: "৫-১০ বছর" },
  { value: "10_plus", en: "10+ Years", bn: "১০+ বছর" },
];

// Helper to get label by value
export function getLabel(
  list: { value: string; en: string; bn: string }[],
  value: string,
  lang: "en" | "bn" = "en"
): string {
  return list.find((item) => item.value === value)?.[lang] ?? value;
}
