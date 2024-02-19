import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import { generateImage } from "../../generate-image";
import { gameService } from "../../game/game-service";
import { verifySignedUrl } from "../../utils";

function getRequestUrl(req: NextRequest) {
  const protocol = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const baseUrl = `${protocol}://${host}`;

  const url = req.nextUrl;
  return baseUrl + url.pathname + url.search;
}

async function renderImageToRes(svg: string): Promise<NextResponse> {
  const pngBuffer = await sharp(Buffer.from(svg)).toFormat("png").toBuffer();

  const res = new NextResponse(pngBuffer);
  // Set the content type to PNG and send the response
  res.headers.set("Content-Type", "image/png");
  res.headers.set("Cache-Control", "max-age=10");
  return res;
}

export async function GET(req: NextRequest) {
  try {
    verifySignedUrl(getRequestUrl(req));
    const params = req.nextUrl.searchParams;
    const gid = params.get("gid");
    const msg = params.get("msg");
    const game = gid ? await gameService.load(gid) : null;
    const svg = await generateImage(game, msg);
    return renderImageToRes(svg);
  } catch (e) {
    console.error(e);
    const svg = await generateImage(undefined, "Error occured :/");
    return renderImageToRes(svg);
  }
}
