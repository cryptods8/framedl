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

import { generateImage } from "./generate-image";
import { gameService } from "./game/game-service";

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

interface GameFrame {
  status: "initial" | "in_progress" | "invalid" | "finished";
  image: string;
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
      image: await generateImage(undefined, "Start FRAMEDL"),
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
      image: await generateImage(game, message),
    };
  }
  if (game.guesses.length === 0 && !inputText) {
    return {
      status: "initial",
      image: await generateImage(game, "Start guessing..."),
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
      image: await generateImage(game, message),
    };
  }

  if (game.originalGuesses.includes(guess)) {
    return {
      status: "invalid",
      image: await generateImage(game, "Already guessed!"),
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
      image: await generateImage(guessedGame, message),
    };
  }

  return {
    status: "in_progress",
    image: await generateImage(guessedGame),
  };
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

  console.log('MESSAGE', state, validMessage, previousFrame.postBody);
  // Here: do a server side side effect either sync or async (using await), such as minting an NFT if you want.
  // example: load the users credentials & check they have an NFT

  const fid = validMessage?.data.fid;
  const { inputText: inputTextBytes } =
    validMessage?.data.frameActionBody || {};
  const inputText = state.status !== 'finished' && inputTextBytes
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

  const svgImage = nextFrameData.image;
  // render image to png and encode as data url
  const image = await svgToPng(svgImage);
  const imageSrc = `data:image/png;base64,${image.toString("base64")}`;

  return (
    <div>
      <FrameContainer
        postUrl="/frames"
        state={{ ...state, status: nextFrameData.status }}
        previousFrame={previousFrame}
      >
        <FrameImage src={imageSrc} />
        {isFinished ? null : <FrameInput text="Make your guess..." />}
        <FrameButton onClick={dispatch}>{buttonLabel}</FrameButton>
      </FrameContainer>
      <div style={{ padding: "3rem", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Framedl made by <Link href="https://warpcast.com/ds8">ds8</Link>
      </div>
    </div>
  );
}
