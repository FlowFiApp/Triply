import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/lib/theme";
import { ToastProvider } from "@/lib/toast";
import { I18nProvider } from "@/lib/i18n";
import { WalletProvider } from "@/lib/wallet-state";
import { PointsProvider } from "@/lib/points";
import { FlowProvider } from "@/lib/flow-context";
import { OfflineBanner } from "@/components/ui/feedback";
import OnboardingGate from "@/components/OnboardingGate";
import ConfigBanner from "@/components/ConfigBanner";
import PageTransition from "@/components/PageTransition";
import "./globals.css";

export const metadata: Metadata = {
  title: "Triply — Web3 Travel",
  description:
    "Book flights, stays and cars with USDT on-chain. Price-guaranteed, instant settlement, no accounts needed.",
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
            <ToastProvider>
              <WalletProvider>
                <PointsProvider>
                  <FlowProvider>
                    <OnboardingGate />
                    <ConfigBanner />
                    <OfflineBanner />
                    <PageTransition>{children}</PageTransition>
                  </FlowProvider>
                </PointsProvider>
              </WalletProvider>
            </ToastProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}