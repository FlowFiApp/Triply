import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/lib/theme";
import { ToastProvider } from "@/lib/toast";
import { I18nProvider } from "@/lib/i18n";
import { WalletProvider } from "@/lib/wallet-state";
import { PointsProvider } from "@/lib/points";
import { FlowProvider } from "@/lib/flow-context";
import { QueryProvider } from "@/lib/query-client";
import DesktopFrame from "@/components/DesktopFrame";
import { DuffelAssistantProvider } from "@/components/DuffelAssistant";
import { OfflineBanner } from "@/components/ui/feedback";
import OnboardingGate from "@/components/OnboardingGate";
import ConfigBanner from "@/components/ConfigBanner";
import SandboxBadge from "@/components/SandboxBadge";
import PageTransition from "@/components/PageTransition";
import "./globals.css";

export const metadata: Metadata = {
  title: "Triply — Web3 Travel",
  description:
    "Book flights, stays and cars with USDT on-chain. Price-guaranteed, instant settlement, no accounts needed.",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider>
          <I18nProvider>
            <QueryProvider>
              <WalletProvider>
                <PointsProvider>
                  <FlowProvider>
                    <DesktopFrame>
                      <ToastProvider>
                        <DuffelAssistantProvider>
                          <OnboardingGate />
                          <ConfigBanner />
                          <SandboxBadge />
                          <OfflineBanner />
                          <PageTransition>{children}</PageTransition>
                        </DuffelAssistantProvider>
                      </ToastProvider>
                    </DesktopFrame>
                  </FlowProvider>
                </PointsProvider>
              </WalletProvider>
            </QueryProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}