import { NextRequest } from "next/server";

import { generateImage } from "../../generate-image";
import { gameService, GuessedGame } from "../../game/game-service";
import { verifySignedUrl, timeCall } from "../../utils";
import { baseUrl } from "../../constants";

function getRequestUrl(req: NextRequest) {
  const url = new URL(req.url);
  const search = url.searchParams.toString();
  return `${baseUrl}${url.pathname}${search ? `?${search}` : ""}`;
}

function verifyUrl(req: NextRequest) {
  const url = getRequestUrl(req);
  let verifiedUrl = url;
  try {
    verifiedUrl = verifySignedUrl(url);
  } catch (e) {
    // TODO remove when this stops happening
    console.error("Failed to verify url", url, (e as any).message);
  }
  return new URL(verifiedUrl);
}

function isGameFinished(game: GuessedGame) {
  return game.status === "LOST" || game.status === "WON";
}

export const dynamic = "force-dynamic";

async function loadGame(gid: string) {
  return timeCall("loadGame", () => gameService.load(gid));
}

async function loadGameStats(fid: number) {
  return timeCall("loadGameStats", () => gameService.loadStats(fid));
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    const url = verifyUrl(req);
    const params = url.searchParams;
    const gid = params.get("gid");
    const msg = params.get("msg");
    const shr = params.get("shr");
    const game = gid ? await loadGame(gid) : null;
    const options = {
      overlayMessage: msg,
      share: shr === "1",
      userStats:
        (game && isGameFinished(game) && (await loadGameStats(game.fid))) ||
        undefined,
    };
    return timeCall("generateImage", () => generateImage(game, options));
  } catch (e) {
    console.error(e);
    return await generateImage(undefined, {
      overlayMessage: "Error occured: " + (e as any).message,
    });
  } finally {
    console.log(`Time for GET /api/images: ${Date.now() - start}ms`);
  }
}
