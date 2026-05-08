import type { Metadata } from "next";
import { Poppins, Libre_Baskerville, Outfit, Inter, Lora, Geist_Mono, Noto_Sans_Bengali, Noto_Sans_Devanagari, Noto_Sans_SC, Noto_Sans_KR, Noto_Sans_JP, Noto_Naskh_Arabic, Fraunces } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { clerkCodexAppearance } from "@/lib/clerk-appearance";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/hooks/use-language";
import { ConvexClientProvider } from "@/components/providers/convex-client-provider";
import { Toaster } from "sonner";
import { CookieBanner } from "@/components/cookie-banner";
import { AccountContextProvider } from "@/components/providers/account-context";
import { UniverseDock } from "@/components/homepage/universe-dock";
import { PostHogProvider } from "@/components/providers/posthog-provider";



const fontSans = Outfit({ subsets: ["latin"], variable: "--font-sans" });
const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-poppins" });
const libreBaskerville = Libre_Baskerville({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-baskerville" });
const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-outfit" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });
const jetbrainsMono = Geist_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });
const notoBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-bengali",
});
const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "600"],
  variable: "--font-devanagari",
});
const notoSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-sc",
});
const notoKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-kr",
});
const notoJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-jp",
});
const notoArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-arabic",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "opsz"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://laborlawpartner.com";

export const metadata: Metadata = {
  title: {
    default: "Labor Law Partner — Bangladesh Labour Law Intelligence",
    template: "%s | Labor Law Partner",
  },
  description: "AI-powered Bangladesh Labour Law search and compliance platform. Search legal provisions, get compliance guidance, and access headhunting services.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Labor Law Partner",
    title: "Labor Law Partner — Bangladesh Labour Law Intelligence",
    description: "AI-powered Bangladesh Labour Law search and compliance platform. Search legal provisions, get compliance guidance, and access headhunting services.",
    images: [
      {
        url: `${SITE_URL}/og`,
        width: 1200,
        height: 630,
        alt: "Labor Law Partner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Labor Law Partner — Bangladesh Labour Law Intelligence",
    description: "AI-powered Bangladesh Labour Law search and compliance platform.",
    images: [`${SITE_URL}/og`],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={clerkCodexAppearance}>
      <PostHogProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebApplication",
                name: "Labor Law Partner",
                alternateName: "Labour Law Partner",
                url: SITE_URL,
                description: "AI-powered Bangladesh Labour Law search, compliance guidance, and headhunting platform.",
                applicationCategory: "LegalService",
                operatingSystem: "Web",
                offers: {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "BDT",
                  description: "Free legal research access",
                },
                publisher: {
                  "@type": "Organization",
                  name: "Labor Law Partner",
                  url: SITE_URL,
                },
                mainEntity: {
                  "@type": "FAQPage",
                  mainEntity: [
                    {
                      "@type": "Question",
                      name: "What is Labor Law Partner?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Labor Law Partner is an AI-powered platform for searching Bangladesh Labour Act 2006, amendments, and labour rules. It provides instant legal research, expert consultations, and headhunting services.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Is Labor Law Partner free to use?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Yes, basic legal research is free for all users. Premium features like advisory analysis, document drafting, and extended conversation memory are available on paid tiers.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "What laws does Labor Law Partner cover?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Labor Law Partner covers the Bangladesh Labour Act 2006, Amendment Acts of 2009, 2010, 2013, and 2018, the Amendment Ordinance 2025, Labour Rules 2015, and Rules Amendment 2022.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Can I use Labor Law Partner for headhunting?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Yes, Labor Law Partner offers a full headhunting module with mandate management, scout network, AI candidate screening, and client dashboards for hiring support.",
                      },
                    },
                  ],
                },
              }),
            }}
          />
        </head>
        <body
          className={`${fontSans.variable} ${poppins.variable} ${libreBaskerville.variable} ${outfit.variable} ${inter.variable} ${lora.variable} ${jetbrainsMono.variable} ${notoBengali.variable} ${notoDevanagari.variable} ${notoSC.variable} ${notoKR.variable} ${notoJP.variable} ${notoArabic.variable} ${fraunces.variable} antialiased`}
          suppressHydrationWarning
        >
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <AccountContextProvider>
              <ConvexClientProvider>
                <LanguageProvider>
                  {children}
                  <UniverseDock />
                  <Toaster richColors position="top-right" />
                  <CookieBanner />
                </LanguageProvider>
              </ConvexClientProvider>
            </AccountContextProvider>
          </ThemeProvider>
        </body>
      </html>
      </PostHogProvider>
    </ClerkProvider>
  );
}
