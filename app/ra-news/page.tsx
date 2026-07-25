import type { Metadata } from "next";
import { RaNewsDesk } from "@/components/ra-news-desk";
import { getRaNews } from "@/lib/ra-news";

export const metadata: Metadata = {
  title: "RA News",
  description:
    "Evidence-ranked rheumatoid arthritis research, treatment news, and practical relief guidance.",
};

export default function RaNewsPage() {
  return <RaNewsDesk initialData={getRaNews()} />;
}
