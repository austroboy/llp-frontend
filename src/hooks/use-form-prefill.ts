"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

export interface FormPrefill {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  designation: string;
  company: string;
  location: string;
  country: string;
  linkedin: string;
  portfolio: string;
  contactName: string;
  workEmail: string;
}

export function useFormPrefill(): { prefill: FormPrefill; isLoaded: boolean } {
  const { user, isLoaded } = useUser();
  const isOrgUser = (user?.publicMetadata as Record<string, unknown> | undefined)?.accountType === "organization";

  const profile = useQuery(
    api.professionalProfiles.getMyProfile,
    isLoaded && user?.id ? {} : "skip"
  );

  // Org users: pull phone + company from organizations table (signup data)
  const org = useQuery(
    api.organizations.getByCreator,
    isLoaded && user?.id && isOrgUser ? { clerkId: user.id } : "skip"
  );

  const fullName = profile?.fullName || org?.primaryContactName || user?.fullName || "";
  const firstName = user?.firstName || fullName.split(" ")[0] || "";
  const lastName = user?.lastName || fullName.split(" ").slice(1).join(" ") || "";
  const email = profile?.email || org?.primaryContactEmail || user?.emailAddresses?.[0]?.emailAddress || "";
  const phone = profile?.phone || org?.primaryContactPhone || "";
  const designation = profile?.currentDesignation || org?.primaryContactDesignation || "";
  const company = profile?.currentOrganization || org?.name || "";
  const cityPart = profile?.city || "";
  const countryPart = profile?.country || "";
  const location = [cityPart, countryPart].filter(Boolean).join(", ");
  const country = countryPart;
  const linkedin = profile?.linkedin || "";
  const portfolio = profile?.portfolio || "";

  // Loaded when Clerk is ready AND both queries have resolved (or been skipped)
  const profileReady = profile !== undefined;
  const orgReady = isOrgUser ? org !== undefined : true;

  return {
    prefill: {
      fullName,
      firstName,
      lastName,
      email,
      phone,
      designation,
      company,
      location,
      country,
      linkedin,
      portfolio,
      contactName: fullName,
      workEmail: email,
    },
    isLoaded: isLoaded && profileReady && orgReady,
  };
}
