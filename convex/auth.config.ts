import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: "https://neat-puma-23.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
