import type { Metadata } from "next";
import { Geist_Mono, Prompt } from "next/font/google";
import { CategoryBootstrap } from "@/features/categories/components/category-bootstrap";
import { UnitBootstrap } from "@/features/units/components/unit-bootstrap";
import { GlobalToastHost } from "@/components/ui/global-toast";
import "./globals.css";
import "./cms.css";
import "./admin-tables.css";

const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "โรงพยาบาลคลองหลวง",
  description: "เว็บไซต์ประชาชนและระบบจัดการเนื้อหาโรงพยาบาล",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${prompt.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><CategoryBootstrap /><UnitBootstrap /><GlobalToastHost />{children}</body>
    </html>
  );
}
