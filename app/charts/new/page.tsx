"use client";

import Link from "next/link";
import { BirthChartForm } from "@/components/BirthChartForm";

export default function NewChartPage() {
  return (
    <main>
      <Link href="/charts" className="back-link">
        ← Мои карты
      </Link>
      <h1>Добавить карту</h1>
      <p className="subtitle">Обычная карта — не заменяет основную</p>
      <BirthChartForm asPrimary={false} />
    </main>
  );
}
