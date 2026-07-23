import type { MarketTile } from "@/lib/alpaca";

function formatPrice(value: number | null) {
  if (value === null) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function MarketStrip({ markets }: { markets: MarketTile[] }) {
  return (
    <section className="market-strip" aria-label="Market overview">
      <div className="market-strip-inner">
        <p className="market-session">
          <span className="live-dot" />
          Market pulse
        </p>
        <div className="market-scroller">
          {markets.map((market) => {
            const positive = (market.changePercent ?? 0) >= 0;
            return (
              <div className="market-tile" key={market.symbol}>
                <div>
                  <strong>{market.label}</strong>
                  <small>{market.symbol}</small>
                </div>
                <div className="market-value">
                  <b>{formatPrice(market.price)}</b>
                  <span
                    className={
                      market.changePercent === null
                        ? "neutral"
                        : positive
                          ? "positive"
                          : "negative"
                    }
                  >
                    {market.changePercent === null
                      ? "Awaiting data"
                      : `${positive ? "+" : ""}${market.changePercent.toFixed(2)}%`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
