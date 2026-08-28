import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Docusage • Minimalist Legal AI Dashboard",
  description: "Enterprise multi-agent contract audit and policy compliance engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#09090b] text-[#f4f4f5] min-h-screen antialiased flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
        {children}
      </body>
    </html>
  );
}
