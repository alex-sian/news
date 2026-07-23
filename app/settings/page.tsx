import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <PlaceholderPage
      eyebrow="Make it yours"
      title="Settings"
      description="Tune the news mix, display and data connections behind your daily brief."
      items={[
        {
          title: "News preferences",
          description: "Choose topics, sectors, sources and the balance between breadth and focus.",
        },
        {
          title: "Alpaca connection",
          description: "Securely connect and test your own Alpaca market-data credentials.",
        },
        {
          title: "Display",
          description: "Set density, theme and the market context shown at the top of your feed.",
        },
      ]}
    />
  );
}
