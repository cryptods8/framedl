import {
  FrameButton,
  FrameContainer,
  FrameImage,
  getPreviousFrame,
} from "frames.js/next/server";
import { NextServerPageProps } from "frames.js/next/types";
import { baseUrl } from "../constants";
import { signUrl } from "../utils";

export default async function Leaderboard({
  searchParams,
}: NextServerPageProps) {
  const previousFrame = getPreviousFrame(searchParams);
  const fidStr = searchParams?.fid;
  const fid = fidStr ? parseInt(fidStr as string, 10) : undefined;

  const imageUrl = `${baseUrl}/api/images/leaderboard${
    fid ? `?fid=${fid}` : ""
  }`;
  const signedImageUrl = signUrl(imageUrl);

  return (
    <div>
      <FrameContainer
        pathname="/leaderboard"
        postUrl="/frames"
        previousFrame={previousFrame}
        state={{}}
      >
        <FrameImage src={signedImageUrl} />
        <FrameButton target="/">Play Framedl</FrameButton>
      </FrameContainer>
    </div>
  );
}
