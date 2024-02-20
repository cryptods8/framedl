import { NextRequest, NextResponse } from "next/server";

const BASE_URL =
  process.env["VERCEL_ENV"] === "production"
    ? "https://framedl.vercel.app"
    : "http://localhost:3000";

function getRequestUrl(req: NextRequest) {
  // const protocol = req.headers.get("x-forwarded-proto") || "https";
  // const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  // const baseUrl = `${protocol}://${host}`;

  const url = new URL(req.url);
  return BASE_URL + url.pathname + url.search;
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const fwdProto = req.headers.get("x-forwarded-proto");
  const fwdHost = req.headers.get("x-forwarded-host");
  const host = req.headers.get("host");

  return NextResponse.json({
    baseUrl: BASE_URL,
    pathname: url.pathname,
    search: url.search,
    fwdProto,
    fwdHost,
    host,
    extractedUrl: getRequestUrl(req),
  });
}
