import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthGuard } from "@/components/AuthGuard";
import { TopNav } from "@/components/TopNav";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Simple-CMS",
  description: "Content management system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.className} h-full bg-gray-50`}>
      <body className="min-h-full bg-gray-50 antialiased">
        <AuthGuard>
          <TopNav />
          <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
        </AuthGuard>
      </body>
    </html>
  );
}
