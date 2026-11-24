import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Astro App — натальная карта",
  description: "Построение натальной карты по дате, времени и месту рождения",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <Header />
        {children}
        <footer className="site-footer">
          <Link href="/privacy">Политика персональных данных</Link>
        </footer>
      </body>
    </html>
  );
}
