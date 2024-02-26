import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import { generateImage } from "../../generate-image";
import { gameService, GuessedGame } from "../../game/game-service";
import { verifySignedUrl } from "../../utils";
import { baseUrl } from "../../constants";

function getRequestUrl(req: NextRequest) {
  const url = new URL(req.url);
  const search = url.searchParams.toString();
  return `${baseUrl}${url.pathname}${search ? `?${search}` : ""}`;
}

async function renderImageToRes(svg: string): Promise<NextResponse> {
  const pngBuffer = await sharp(Buffer.from(svg)).toFormat("png").toBuffer();

  const res = new NextResponse(pngBuffer);
  // Set the content type to PNG and send the response
  res.headers.set("Content-Type", "image/png");
  res.headers.set("Cache-Control", "max-age=10");
  return res;
}

function verifyUrl(req: NextRequest) {
  const url = getRequestUrl(req);
  return new URL(verifySignedUrl(url));
}

function isGameFinished(game: GuessedGame) {
  return game.status === "LOST" || game.status === "WON";
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = verifyUrl(req);
    const params = url.searchParams;
    const gid = params.get("gid");
    const msg = params.get("msg");
    const shr = params.get("shr");
    const game = gid ? await gameService.load(gid) : null;
    const svg = await generateImage(game, {
      overlayMessage: msg,
      share: shr === "1",
      userStats:
        (game &&
          isGameFinished(game) &&
          (await gameService.loadStats(game.fid))) ||
        undefined,
    });
    return renderImageToRes(svg);
  } catch (e) {
    console.error(e);
    const svg = await generateImage(undefined, {
      overlayMessage: "Error occured: " + (e as any).message,
    });
    return renderImageToRes(svg);
  }
}
