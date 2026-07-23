import { HomeFeed } from "@/components/home-feed";
import { getHomePayload } from "@/lib/alpaca";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getHomePayload();
  return <HomeFeed initialData={data} />;
}
