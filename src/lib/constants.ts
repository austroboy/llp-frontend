/**
 * Master Dropdown Constants — LLP Universe
 *
 * Single source of truth for all shared dropdown options.
 * Every page/component MUST import from here instead of defining local lists.
 *
 * Rules:
 * - "Other" always goes last
 * - Alphabetical order within logical groupings
 * - Same label, same spelling, same value everywhere
 */

// ── Industry ──────────────────────────────────────────────────────────
export const INDUSTRIES = [
  "Agriculture and Agribusiness",
  "Airlines, Travel and Tourism",
  "Architecture, Engineering and Construction",
  "Automotive and Industrial Machinery",
  "Banking and Financial Services",
  "BPO / ITES",
  "E-commerce and F-commerce",
  "Education and Training",
  "Electronics and Consumer Durables",
  "Energy, Power and Fuel",
  "Entertainment and Recreation",
  "Fire, Safety and Protection Services",
  "Food and Beverage",
  "Garments and Textiles",
  "Government, Semi-Government and Autonomous Bodies",
  "Heavy Manufacturing",
  "Hospitality and Food Services",
  "Hospitals and Diagnostic Services",
  "Information Technology",
  "Legal and Consulting",
  "Light Manufacturing",
  "Logistics and Transportation",
  "Media, Advertising and Events",
  "Mining and Heavy Industry",
  "NGO and Development",
  "Pharmaceuticals",
  "Real Estate and Property Development",
  "Security Services",
  "Telecommunications",
  "Wholesale, Retail and Trading",
  "Other",
] as const;

// ── Organization Type ──────────────────────────────────────────────────
export const ORG_TYPES = [
  "Private Limited Company",
  "Public Limited Company",
  "Multinational Company",
  "Group of Companies",
  "Factory / Plant / Industrial Unit",
  "SME / Small Business",
  "Partnership Firm",
  "Sole Proprietorship",
  "NGO / Development Organization",
  "Association / Trade Body / Chamber",
  "Law Firm",
  "Consultancy / Advisory Firm",
  "Recruitment / Staffing Agency",
  "Educational Institution",
  "Hospital / Healthcare Institution",
  "Financial Institution / Bank / Insurance",
  "Government / Semi-Government / Autonomous Body",
  "EPZ Enterprise",
  "Foreign Representative Office / Liaison Office",
  "Other",
] as const;

// ── Employee Count Range ──────────────────────────────────────────────
export const EMPLOYEE_RANGES = [
  "1–10",
  "11–50",
  "51–200",
  "201–500",
  "501–1000",
  "1000+",
] as const;

// ── Countries (BD-focused, most common first) ──────────────────────────
export const COUNTRIES = [
  "Bangladesh",
  "India",
  "Pakistan",
  "Sri Lanka",
  "Nepal",
  "United Arab Emirates",
  "Saudi Arabia",
  "Malaysia",
  "Singapore",
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "Germany",
  "Japan",
  "South Korea",
  "China",
  "Other",
] as const;

// ── Bangladesh Cities / Locations ─────────────────────────────────────
export const BD_CITIES = [
  "Dhaka",
  "Chattogram",
  "Sylhet",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Rangpur",
  "Mymensingh",
  "Comilla",
  "Gazipur",
  "Narayanganj",
  "Cox's Bazar",
  "Other",
] as const;

// ── Functional Areas / Departments ────────────────────────────────────
export const FUNCTIONAL_AREAS = [
  "Human Resources",
  "Finance and Accounting",
  "Marketing and Brand",
  "Sales and Business Development",
  "Operations",
  "Supply Chain and Procurement",
  "IT / Technology",
  "Engineering",
  "Legal and Compliance",
  "Admin and Facilities",
  "Quality Assurance / QC",
  "Production / Manufacturing",
  "Research and Development",
  "Customer Service",
  "Corporate Strategy",
  "Internal Audit",
  "Other",
] as const;

// ── Seniority / Role Levels ───────────────────────────────────────────
export const SENIORITY_LEVELS = [
  "Entry Level",
  "Junior",
  "Mid-Level",
  "Senior",
  "Lead / Principal",
  "Manager",
  "Senior Manager",
  "Director",
  "VP / Head",
  "C-Level / CXO",
  "Board / Advisor",
  "Other",
] as const;
