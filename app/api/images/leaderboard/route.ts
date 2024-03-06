import { NextRequest } from "next/server";

import { generateLeaderboardImage } from "../../../generate-image";
import { gameService } from "../../../game/game-service";
import { verifySignedUrl, timeCall } from "../../../utils";
import { baseUrl } from "../../../constants";

function getRequestUrl(req: NextRequest) {
  const url = new URL(req.url);
  const search = url.searchParams.toString();
  return `${baseUrl}${url.pathname}${search ? `?${search}` : ""}`;
}

function verifyUrl(req: NextRequest) {
  const url = getRequestUrl(req);
  return new URL(verifySignedUrl(url));
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    const url = verifyUrl(req);
    const params = url.searchParams;
    const fidParam = params.get("fid");
    const fid = fidParam ? parseInt(fidParam, 10) : undefined;

    const leaderboard = await timeCall("loadLeaderboard", () =>
      gameService.loadLeaderboard(fid)
    );

    return timeCall("generateLeaderboardImage", () =>
      generateLeaderboardImage(leaderboard)
    );
  } finally {
    console.log(
      `Time for GET /api/images/leaderboard: ${Date.now() - start}ms`
    );
  }
}
