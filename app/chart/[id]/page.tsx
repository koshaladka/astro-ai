"use client";

import { useParams } from "next/navigation";
import { ChartView } from "@/components/ChartView";

export default function ChartPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <main>
      <ChartView chartId={id} backHref="/charts" backLabel="← Мои карты" />
    </main>
  );
}
