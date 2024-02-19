import {
  FrameButton,
  FrameContainer,
  FrameImage,
  FrameInput,
  FrameReducer,
  getPreviousFrame,
  useFramesReducer,
  validateActionSignature,
} from "frames.js/next/server";
import Link from "next/link";
import sharp from "sharp";

import { signUrl } from "./utils";
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
}

interface GameFrame {
  status: "initial" | "in_progress" | "invalid" | "finished";
  imageParams: GameImageParams;
  game?: GuessedGame;
}

async function svgToPng(svg: string) {
  return sharp(Buffer.from(svg)).toFormat("png").toBuffer();
}

async function nextFrame(
  fid: number | undefined,
  inputText: string | undefined
): Promise<GameFrame> {
  if (!fid) {
    return {
      status: "initial",
      imageParams: { message: "Start FRAMEDL" },
    };
  }
  const game = await gameService.loadOrCreate(fid);
  if (game.status !== "IN_PROGRESS") {
    const message =
      game.status === "WON"
        ? "You won!"
        : `The correct word was "${game.word.toUpperCase()}"`;
    return {
      status: "finished",
      imageParams: { gameId: game.id, message },
      game,
    };
  }
  if (game.guesses.length === 0 && !inputText) {
    return {
      status: "initial",
      imageParams: { gameId: game.id, message: "Start guessing..." },
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
    const message =
      guessedGame.status === "WON"
        ? "You won!"
        : `The correct word was "${guessedGame.word.toUpperCase()}"`;
    return {
      status: "finished",
      imageParams: { gameId: guessedGame.id, message },
      game: guessedGame,
    };
  }

  return {
    status: "in_progress",
    imageParams: { gameId: guessedGame.id },
    game: guessedGame,
  };
}

const BASE_URL =
  process.env["VERCEL_ENV"] === "production"
    ? "https://framedl.vercel.app"
    : "http://localhost:3000";

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
  const unsignedImageSrc = `${BASE_URL}/api/images?${params.toString()}`;
  return signUrl(unsignedImageSrc);
}

// This is a react server component only
export default async function Home({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const previousFrame = getPreviousFrame<State>(searchParams);

  const validMessage = await validateActionSignature(previousFrame.postBody);

  const [state, dispatch] = useFramesReducer<State>(
    reducer,
    initialState,
    previousFrame
  );

  // console.log("SP", searchParams, baseUrl);

  // Here: do a server side side effect either sync or async (using await), such as minting an NFT if you want.
  // example: load the users credentials & check they have an NFT

  const fid = validMessage?.data.fid;
  const { inputText: inputTextBytes } =
    validMessage?.data.frameActionBody || {};
  const inputText =
    state.status !== "finished" && inputTextBytes
      ? Buffer.from(inputTextBytes).toString("utf-8")
      : undefined;

  const nextFrameData = await nextFrame(fid, inputText);

  // then, when done, return next frame
  const isFinished = nextFrameData.status === "finished";
  const buttonLabel = isFinished
    ? `Play again in ${24 - new Date().getUTCHours()} hours`
    : fid
    ? "Guess"
    : "Start";

  const game = nextFrameData.game;

  const gameById = searchParams.id
    ? await gameService.load(searchParams.id)
    : null;

  return (
    <div>
      <FrameContainer
        postUrl="/frames"
        state={{ ...state, status: nextFrameData.status }}
        previousFrame={previousFrame}
      >
        <FrameImage src={buildImageUrl(nextFrameData.imageParams, fid)} />
        {isFinished || !fid ? null : <FrameInput text="Make your guess..." />}
        <FrameButton onClick={dispatch}>{buttonLabel}</FrameButton>
        {isFinished && game ? (
          <FrameButton href={`${BASE_URL}/?id=${game.id}`}>Share</FrameButton>
        ) : null}
      </FrameContainer>
      <div className="flex flex-col p-6 w-full justify-center items-center">
        {gameById && <GameResult game={gameById} shareUrl={BASE_URL} />}
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
