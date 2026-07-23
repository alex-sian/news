"use client";

import { useEffect, useState } from "react";
import type { SymbolPayload } from "@/lib/alpaca";

export function SymbolWorkspace({ symbol, onClose, onExpand }: { symbol: string; onClose: () => void; onExpand: () => void }) {
  const [data, setData] = useState<SymbolPayload | null>(null);
  useEffect(() => { setData(null); fetch(`/api/symbol/${symbol}`).then(r => r.json()).then(setData).catch(() => setData(null)); }, [symbol]);
  const points = data?.bars ?? [];
  const values = points.map(p => p.c); const lo = Math.min(...values, 0); const hi = Math.max(...values, 1);
  const path = values.map((v, i) => `${i ? "L" : "M"}${(i / Math.max(values.length - 1, 1)) * 100},${90 - ((v - lo) / Math.max(hi - lo, .01)) * 75}`).join(" ");
  const up = (data?.change ?? 0) >= 0;
  return <section className="symbol-workspace" aria-label={`${symbol} workspace`}>
    <header className="workspace-header"><button onClick={onClose}>← News</button><span>Symbol workspace</span><div><button onClick={onExpand}>Expand</button><button onClick={onClose} aria-label="Close symbol workspace">×</button></div></header>
    <div className="symbol-title"><div><p className="kicker">Equity research</p><h2>{symbol}</h2></div><strong className={up ? "positive" : "negative"}>{data?.price ? `$${data.price.toFixed(2)}` : "Loading…"}<small>{data?.changePercent !== null && data?.changePercent !== undefined ? `${up ? "+" : ""}${data.changePercent.toFixed(2)}% today` : ""}</small></strong></div>
    <div className="symbol-chart"><div className="chart-label">Two-week price action <span>Alpaca IEX</span></div>{points.length > 1 ? <svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d={path} /></svg> : <p>Chart data is loading.</p>}</div>
    <div className="symbol-news"><div className="section-heading"><div><p className="kicker">Related coverage</p><h2>{symbol} news</h2></div></div>{data?.articles.slice(0, 5).map(article => <a key={article.id} href={article.url} target="_blank" rel="noreferrer"><strong>{article.headline}</strong><span>{article.source}</span></a>)}</div>
  </section>;
}
