import type { Metadata } from "next";
import { Prompt, Mali } from "next/font/google";
import "./globals.css";

// Readable body font — geometric, feminine, and (unlike the previous font)
// ships a Thai subset so Thai UI text renders in-family instead of a fallback.
const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
});

// Display font for headings / CTA / badges — rounded and sweet.
// The CSS stack lists "Arabica" first (see globals.css --font-display), so if
// Arabica is installed locally it wins; otherwise it falls back to Mali.
const mali = Mali({
  variable: "--font-mali",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Winkwink Review Center",
  description: "ค้นหารีวิวตามรุ่นอุปกรณ์ เลนส์ สถานที่ และปีที่ใช้งาน",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${prompt.variable} ${mali.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-text">
        {children}
      </body>
    </html>
  );
}
