import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = { title: "Watchlists" };

export default function WatchlistsPage() {
  return (
    <PlaceholderPage
      eyebrow="Your market"
      title="Watchlists"
      description="A focused home for the companies, funds and themes you want to follow."
      items={[
        {
          title: "Custom lists",
          description: "Group symbols by portfolio, idea, sector or whatever matters to you.",
        },
        {
          title: "News-first monitoring",
          description: "See the newest stories attached to every symbol you follow.",
        },
        {
          title: "At-a-glance movement",
          description: "Pair the latest price context with the news driving the session.",
        },
      ]}
    />
  );
}
