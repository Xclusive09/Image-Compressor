import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NYSC Image Compressor",
  description:
    "Compress passport/photos to a target file size with the best possible quality."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
