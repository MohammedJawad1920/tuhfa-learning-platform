import "./globals.css";
import React from "react";

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
      </head>
      <body>{children}</body>
    </html>
  );
}
