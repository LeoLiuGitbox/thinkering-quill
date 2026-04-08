import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thinkering Quill — The Archive Hall",
  description: "A magical learning journey through the Archive Hall. WA GATE preparation for young mages.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
