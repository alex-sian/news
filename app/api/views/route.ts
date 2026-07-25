import { NextResponse } from "next/server";
import { clearViewedArticle, markArticleViewed, ownerTrackingFromCookie } from "@/lib/db";
import type { TopicArticle } from "@/lib/topics";

export async function POST(request: Request) {
  if (!ownerTrackingFromCookie(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, error: "owner_tracking_disabled" }, { status: 403 });
  }
  const body = (await request.json()) as {
    articleId?: string;
    topicSlug?: string;
    article?: TopicArticle;
  };
  if (!body.articleId || !body.topicSlug) {
    return NextResponse.json({ ok: false, error: "missing_article" }, { status: 400 });
  }
  return NextResponse.json(await markArticleViewed(body.articleId, body.topicSlug, body.article));
}

export async function DELETE(request: Request) {
  if (!ownerTrackingFromCookie(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, error: "owner_tracking_disabled" }, { status: 403 });
  }
  const articleId = new URL(request.url).searchParams.get("articleId");
  if (!articleId) {
    return NextResponse.json({ ok: false, error: "missing_article" }, { status: 400 });
  }
  return NextResponse.json(await clearViewedArticle(articleId));
}
