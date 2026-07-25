import { SiteHeader } from "@/components/site-header";
import { SymbolWorkspace } from "@/components/symbol-workspace";
export const dynamic = "force-dynamic";
export default async function SymbolPage({ params }: { params: Promise<{ symbol: string }> }) { return <><SiteHeader /><SymbolWorkspace symbol={(await params).symbol.toUpperCase()} /></>; }
