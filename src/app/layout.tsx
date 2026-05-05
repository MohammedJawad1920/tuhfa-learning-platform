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
    <html lang="ar">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Naskh+Arabic:wght@400;700&family=Noto+Sans+Malayalam:wght@400;600&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
