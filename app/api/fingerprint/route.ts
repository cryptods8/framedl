import { NextRequest } from "next/server";

import { generateFingerprint } from "../../generate-image";
import { gameService } from "../../game/game-service";
import { verifySignedUrl, timeCall } from "../../utils";
import { baseUrl } from "../../constants";

function getRequestUrl(req: NextRequest) {
  const url = new URL(req.url);
  const search = url.searchParams.toString();
  return `${baseUrl}${url.pathname}${search ? `?${search}` : ""}`;
}

export const dynamic = "force-dynamic";

function verifyUrl(req: NextRequest) {
  const url = getRequestUrl(req);
  return new URL(verifySignedUrl(url));
}

async function loadAllGamesByFid(fid: number) {
  return timeCall("loadAllGamesByFid", () => gameService.loadAllByFid(fid));
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    const url = verifyUrl(req);
    const params = url.searchParams;
    const fid = parseInt(params.get("fid") as string, 10);
    const date = params.get("date") as string | undefined;
    const games = await loadAllGamesByFid(fid);
    return timeCall("generateFingerprint", () =>
      generateFingerprint(games, date)
    );
  } finally {
    console.log(`Time for GET /api/fingerprint: ${Date.now() - start}ms`);
  }
}
