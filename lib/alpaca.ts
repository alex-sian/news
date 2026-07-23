export type NewsImage = {
  size?: string;
  url?: string;
};

export type NewsArticle = {
  id: number;
  headline: string;
  summary: string;
  author?: string;
  created_at: string;
  updated_at: string;
  url: string;
  symbols: string[];
  source: string;
  images?: NewsImage[];
};

export type MarketTile = {
  symbol: string;
  label: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
};

export type HomePayload = {
  articles: NewsArticle[];
  markets: MarketTile[];
  updatedAt: string;
  isLive: boolean;
  message?: string;
};

const MARKET_SYMBOLS = [
  { symbol: "SPY", label: "S&P 500" },
  { symbol: "DIA", label: "Dow" },
  { symbol: "QQQ", label: "Nasdaq" },
  { symbol: "IWM", label: "Russell 2000" },
  { symbol: "VXX", label: "Volatility" },
];

const fallbackArticles: NewsArticle[] = [
  {
    id: -1,
    headline: "Connect Alpaca to bring the latest market news into focus",
    summary:
      "This preview is ready for Alpaca’s broad market-news feed. Once credentials are connected, the page refreshes with the newest stories across stocks and crypto.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    url: "https://alpaca.markets/data",
    symbols: ["SPY", "QQQ"],
    source: "Market Brief",
  },
  {
    id: -2,
    headline: "A cleaner way to scan the trading day",
    summary:
      "Lead stories, market context and symbol tags are organized for quick reading on a phone and richer exploration on a larger screen.",
    created_at: new Date(Date.now() - 20 * 60_000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 60_000).toISOString(),
    url: "https://alpaca.markets/data",
    symbols: ["DIA"],
    source: "Market Brief",
  },
  {
    id: -3,
    headline: "Watchlists and personal settings are coming next",
    summary:
      "The navigation and placeholder pages are in place for the next product pass.",
    created_at: new Date(Date.now() - 45 * 60_000).toISOString(),
    updated_at: new Date(Date.now() - 45 * 60_000).toISOString(),
    url: "https://alpaca.markets/data",
    symbols: ["IWM"],
    source: "Market Brief",
  },
];

function credentials() {
  return {
    key:
      process.env.ALPACA_API_KEY ??
      process.env.APCA_API_KEY_ID ??
      process.env.ALPACA_API_KEY_ID,
    secret:
      process.env.ALPACA_SECRET_KEY ??
      process.env.APCA_API_SECRET_KEY ??
      process.env.ALPACA_API_SECRET,
  };
}

function headers(key: string, secret: string) {
  return {
    "APCA-API-KEY-ID": key,
    "APCA-API-SECRET-KEY": secret,
  };
}

function clean(value: string | undefined) {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeArticle(article: NewsArticle): NewsArticle {
  return {
    ...article,
    headline: clean(article.headline),
    summary: clean(article.summary),
    symbols: article.symbols ?? [],
  };
}

async function getNews(key: string, secret: string) {
  const params = new URLSearchParams({
    sort: "desc",
    limit: "50",
    include_content: "false",
    exclude_contentless: "false",
  });
  const response = await fetch(
    `https://data.alpaca.markets/v1beta1/news?${params}`,
    {
      headers: headers(key, secret),
      next: { revalidate: 60 },
    },
  );

  if (!response.ok) {
    throw new Error(`Alpaca news request failed (${response.status})`);
  }

  const data = (await response.json()) as { news?: NewsArticle[] };
  return (data.news ?? []).map(normalizeArticle);
}

type Snapshot = {
  dailyBar?: { c?: number };
  prevDailyBar?: { c?: number };
  latestTrade?: { p?: number };
};

async function getMarkets(key: string, secret: string): Promise<MarketTile[]> {
  const symbols = MARKET_SYMBOLS.map((item) => item.symbol).join(",");
  const response = await fetch(
    `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${symbols}&feed=iex`,
    {
      headers: headers(key, secret),
      next: { revalidate: 60 },
    },
  );

  if (!response.ok) {
    return MARKET_SYMBOLS.map((item) => ({
      ...item,
      price: null,
      change: null,
      changePercent: null,
    }));
  }

  const snapshots = (await response.json()) as Record<string, Snapshot>;
  return MARKET_SYMBOLS.map((item) => {
    const snapshot = snapshots[item.symbol];
    const current = snapshot?.latestTrade?.p ?? snapshot?.dailyBar?.c ?? null;
    const previous = snapshot?.prevDailyBar?.c ?? null;
    const change =
      current !== null && previous !== null ? current - previous : null;
    return {
      ...item,
      price: current,
      change,
      changePercent:
        change !== null && previous ? (change / previous) * 100 : null,
    };
  });
}

export async function getHomePayload(): Promise<HomePayload> {
  const { key, secret } = credentials();

  if (!key || !secret) {
    return {
      articles: fallbackArticles,
      markets: MARKET_SYMBOLS.map((item) => ({
        ...item,
        price: null,
        change: null,
        changePercent: null,
      })),
      updatedAt: new Date().toISOString(),
      isLive: false,
      message: "Alpaca credentials are not connected yet.",
    };
  }

  try {
    const [articles, markets] = await Promise.all([
      getNews(key, secret),
      getMarkets(key, secret),
    ]);
    return {
      articles: articles.length ? articles : fallbackArticles,
      markets,
      updatedAt: new Date().toISOString(),
      isLive: articles.length > 0,
      message: articles.length ? undefined : "Alpaca returned no recent stories.",
    };
  } catch (error) {
    return {
      articles: fallbackArticles,
      markets: MARKET_SYMBOLS.map((item) => ({
        ...item,
        price: null,
        change: null,
        changePercent: null,
      })),
      updatedAt: new Date().toISOString(),
      isLive: false,
      message:
        error instanceof Error
          ? error.message
          : "The market feed is temporarily unavailable.",
    };
  }
}
