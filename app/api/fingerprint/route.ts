import { NextRequest } from "next/server";
// import fs from "fs";

import { generateFingerprint } from "../../generate-image";
import { gameService, GuessedGame } from "../../game/game-service";
import { timeCall } from "../../utils";

export const dynamic = "force-dynamic";

async function loadAllGamesByFid(fid: number) {
  return timeCall("loadAllGamesByFid", () => gameService.loadAllByFid(fid));
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    const url = new URL(req.url);
    const params = url.searchParams;
    // const fid = parseInt(params.get("fid") as string, 10);
    // const games = await loadAllGamesByFid(fid);
    // fs.writeFileSync("games.json", JSON.stringify(games, null, 2));
    const games: GuessedGame[] = []; //JSON.parse(fs.readFileSync("games.json", "utf-8"));
    return timeCall("generateFingerprint", () => generateFingerprint(games));
  } finally {
    console.log(`Time for GET /api/fingerprint: ${Date.now() - start}ms`);
  }
}
