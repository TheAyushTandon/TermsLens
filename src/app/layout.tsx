import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TermsLens | Understand what you're agreeing to",
  description:
    "An AI-powered Terms & Conditions and Privacy Policy explainer for everyday users. Break down complex policies into simple explanations, important clauses, and potential red flags.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#FBFBFD] text-[#090D16] dark:bg-[#090D16] dark:text-[#F8FAFC]">
        {children}
      </body>
    </html>
  );
}
