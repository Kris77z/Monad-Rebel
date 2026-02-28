import type { Metadata } from "next";
import { Halant } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import "./globals.css";

const halant = Halant({
  variable: "--font-halant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Rebel Agent Mesh | Monad",
  description:
    "Autonomous Agent Economy on Monad — x402 powered agent-to-agent service network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${halant.variable} ${GeistSans.variable} ${GeistMono.variable} antialiased bg-background text-foreground`}
      >
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
