import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TranslationRuntime from "../components/TranslationRuntime";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KhetLink",
  description:
    "Connecting farmers, logistics providers and buyers through a smarter agricultural supply chain.",
  icons: { icon: "/Khetlink_Logo.svg", shortcut: "/Khetlink_Logo.svg", apple: "/Khetlink_Logo.svg" },
};

export default function RootLayout({children,}: Readonly<{children: React.ReactNode;}>){
  return(
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}  h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}<TranslationRuntime /></body>
    </html>
  );
}