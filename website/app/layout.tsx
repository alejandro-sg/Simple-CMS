import type { Metadata } from "next";
import "./globals.css";
import { getSiteContent } from "@/lib/api";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: { default: "Simple-CMS Website", template: "%s | Simple-CMS" },
  description: "Powered by Simple-CMS",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = await getSiteContent();

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-white text-gray-900 antialiased">
        <Nav content={content} />
        <main className="flex-1">{children}</main>
        <Footer content={content} />
      </body>
    </html>
  );
}
