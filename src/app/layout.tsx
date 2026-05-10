import "./globals.css";
import React from "react";
import { Providers } from "@/components/providers";

export const metadata = {
  title: "Tuhfat al-Muhtaj",
  description: "Audio lessons by Sheikh Dr. Abdul Hakim Al-Sa'di",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
