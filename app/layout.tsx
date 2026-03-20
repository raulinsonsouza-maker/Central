import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Central de Clientes | Inout",
  description: "Hub consolidado de performance comercial",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} font-sans min-h-screen`}>
        <Providers>
          <Header />
          <div className="container mx-auto px-4 py-6">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
