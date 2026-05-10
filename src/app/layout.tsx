import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Operating System",
  description: "달력·노트 등 개인 운영 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
