import type { Metadata, Viewport } from "next";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import { LocaleSyncEffect } from "@/components/i18n/locale-sync-effect";
import { Toaster } from "@/components/ui/sonner";
import { getServerLocale } from "@/lib/i18n/server-preference";
import { cn } from "@/utils/utils";
import "./globals.css";


const siteUrl = process.env.SITE_URL?.trim() || undefined;
const siteTitle = process.env.NEXT_PUBLIC_APP_TITLE?.trim() || "AI Research Agent";
const siteDescription =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION?.trim() ||
  "Research complex questions and read source-grounded reports.";

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    type: "website",
    title: siteTitle,
    description: siteDescription,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn("h-full antialiased", "font-sans")}
    >
      <body className="flex h-full flex-col">
        <I18nProvider initialLocale={locale}>
          <LocaleSyncEffect />
          {children}
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
