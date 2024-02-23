import {
  FrameButton,
  FrameContainer,
  FrameImage,
  FrameInput,
  FrameReducer,
  NextServerPageProps,
  getFrameMessage,
  getPreviousFrame,
  useFramesReducer,
} from "frames.js/next/server";
import Link from "next/link";

import { signUrl, verifySignedUrl } from "./utils";
import { baseUrl, hubHttpUrl } from "./constants";
import { gameService, GuessedGame } from "./game/game-service";
import GameResult from "./ui/game-result";

type GameStatus = "initial" | "in_progress" | "invalid" | "finished";
type State = {
  active: string;
  status: GameStatus;
};

const initialState = { status: "initial" as GameStatus, active: "1" };

const reducer: FrameReducer<State> = (state, action) => {
  return {
    ...state,
    active: action.postBody?.untrustedData.buttonIndex
      ? String(action.postBody?.untrustedData.buttonIndex)
      : "1",
  };
};

interface GameImageParams {
  message?: string;
  gameId?: string;
  share?: boolean;
}

interface GameFrame {
  status: "initial" | "in_progress" | "invalid" | "finished";
  imageParams: GameImageParams;
  game?: GuessedGame;
}

function isUrlSigned(
  searchParams:
    | {
        [key: string]: string | string[] | undefined;
      }
    | undefined
) {
  const params = new URLSearchParams();
  for (const key in searchParams) {
    const value = searchParams[key];
    if (value) {
      if (Array.isArray(value)) {
        for (const v of value) {
          params.append(key, v);
        }
      } else {
        params.append(key, value as string);
      }
    }
  }
  const paramsString = params.toString();
  const fullUrl = `${baseUrl}${paramsString ? `?${paramsString}` : ""}`;
  try {
    verifySignedUrl(fullUrl, true);
    return true;
  } catch (e) {
    // ignore
  }
  return false;
}

async function nextFrame(
  fid: number | undefined,
  inputText: string | undefined,
  userData?: GuessedGame["userData"]
): Promise<GameFrame> {
  if (!fid) {
    return {
      status: "initial",
      imageParams: {},
    };
  }
  const game = await gameService.loadOrCreate(fid, userData);
  if (game.status !== "IN_PROGRESS") {
    return {
      status: "finished",
      imageParams: { gameId: game.id },
      game,
    };
  }
  if (game.guesses.length === 0 && !inputText) {
    return {
      status: "initial",
      imageParams: { gameId: game.id },
      game,
    };
  }
  const guess = inputText?.trim().toLowerCase() || "";
  const validationResult = gameService.validateGuess(guess);
  if (validationResult !== "VALID") {
    let message = "Not a valid guess!";
    switch (validationResult) {
      case "INVALID_EMPTY":
      case "INVALID_SIZE":
      case "INVALID_FORMAT":
        message = "Enter a 5-letter word!";
        break;
      case "INVALID_WORD":
        message = "Word not found in dictionary!";
        break;
    }
    return {
      status: "invalid",
      imageParams: { gameId: game.id, message },
      game,
    };
  }

  if (game.originalGuesses.includes(guess)) {
    return {
      status: "invalid",
      imageParams: { gameId: game.id, message: "Already guessed!" },
      game,
    };
  }
  const guessedGame = await gameService.guess(game, guess);
  if (guessedGame.status !== "IN_PROGRESS") {
    return {
      status: "finished",
      imageParams: { gameId: guessedGame.id },
      game: guessedGame,
    };
  }

  return {
    status: "in_progress",
    imageParams: { gameId: guessedGame.id },
    game: guessedGame,
  };
}

function buildImageUrl(p: GameImageParams, fid?: number): string {
  const params = new URLSearchParams();
  if (fid != null) {
    params.append("fid", fid.toString());
  }
  if (p.message) {
    params.append("msg", p.message);
  }
  if (p.gameId) {
    params.append("gid", p.gameId);
  }
  if (p.share) {
    params.append("shr", "1");
  }
  const strParams = params.toString();
  const unsignedImageSrc = `${baseUrl}/api/images${
    strParams ? `?${strParams}` : ""
  }`;
  return signUrl(unsignedImageSrc);
}

// This is a react server component only
export default async function Home({ searchParams }: NextServerPageProps) {
  const previousFrame = getPreviousFrame<State>(searchParams);

  const [state] = useFramesReducer<State>(reducer, initialState, previousFrame);

  const frameMessage = await getFrameMessage(previousFrame.postBody, {
    fetchHubContext: state.status === "initial" || state.status === "finished",
    hubHttpUrl,
  });

  const fid = frameMessage?.requesterFid;
  const inputText =
    state.status !== "finished" ? frameMessage?.inputText : undefined;

  const { game, imageParams, status } = await nextFrame(
    fid,
    inputText,
    frameMessage?.requesterUserData || undefined
  );

  // then, when done, return next frame
  const isFinished = status === "finished";
  const buttonLabel = isFinished
    ? `Play again in ${24 - new Date().getUTCHours()} hours`
    : fid
    ? "Guess"
    : "Start";

  const gameIdParam = searchParams?.id as string;
  const gameById = gameIdParam
    ? await gameService.loadPublic(gameIdParam, isUrlSigned(searchParams))
    : null;

  if (!imageParams.gameId && gameIdParam) {
    imageParams.gameId = gameIdParam;
    imageParams.share = true;
  }

  return (
    <div className="w-full min-h-dvh bg-gradient-to-b from-slate-300 to-slate-200 flex flex-col items-center justify-center p-8 font-inter">
      <FrameContainer
        pathname="/"
        postUrl="/frames"
        state={{ ...state, status }}
        previousFrame={previousFrame}
      >
        <FrameImage src={buildImageUrl(imageParams, fid)} />
        {isFinished || !fid ? null : <FrameInput text="Make your guess..." />}
        <FrameButton>{buttonLabel}</FrameButton>
        {isFinished && game ? (
          <FrameButton
            action="link"
            target={signUrl(`${baseUrl}?id=${game.id}`)}
          >
            Share
          </FrameButton>
        ) : null}
      </FrameContainer>
      <div className="flex flex-col p-6 w-full justify-center items-center">
        <GameResult
          game={gameById}
          shareUrl={`${baseUrl}${gameById ? `?id=${gameById.id}` : ""}`}
        />
        <div className="text-center mt-8 text-sm text-slate-600">
          Framedl made by{" "}
          <Link href="https://warpcast.com/ds8" className="underline">
            ds8
          </Link>
        </div>
      </div>
    </div>
  );
}
