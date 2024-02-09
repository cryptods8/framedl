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
import { generateImage } from "./generate-image";
import { gameService } from "./game/game-service";

type State = {
  active: string;
  total_button_presses: number;
};

const initialState = { active: "1", total_button_presses: 0 };

const reducer: FrameReducer<State> = (state, action) => {
  return {
    total_button_presses: state.total_button_presses + 1,
    active: action.postBody?.untrustedData.buttonIndex
      ? String(action.postBody?.untrustedData.buttonIndex)
      : "1",
  };
};

interface GameFrame {
  status: "initial" | "in_progress" | "invalid" | "finished";
  image: string;
}

async function nextFrame(
  fid: number | undefined,
  inputText: string | undefined
): Promise<GameFrame> {
  if (!fid) {
    return {
      status: "initial",
      image: await generateImage(undefined, "Start guessing..."),
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
  if (!inputText || !gameService.isValidGuess(inputText)) {
    return {
      status: "invalid",
      image: await generateImage(game, "Not a valid guess!"),
    };
  }

  const guess = inputText?.trim() || "";
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

  // Here: do a server side side effect either sync or async (using await), such as minting an NFT if you want.
  // example: load the users credentials & check they have an NFT

  const fid = validMessage?.data.fid;
  const { inputText: inputTextBytes } =
    validMessage?.data.frameActionBody || {};
  const inputText = inputTextBytes
    ? Buffer.from(inputTextBytes).toString("utf-8")
    : undefined;

  const nextFrameData = await nextFrame(fid, inputText);

  // then, when done, return next frame
  const isFinished = nextFrameData.status === "finished";
  const buttonLabel = isFinished
    ? `Play again in ${24 - new Date().getUTCHours()} hours`
    : "Guess";
  return (
    <div>
      <FrameContainer
        postUrl="/frames"
        state={state}
        previousFrame={previousFrame}
      >
        <FrameImage
          src={`data:image/svg+xml,${encodeURIComponent(nextFrameData.image)}`}
        />
        {isFinished ? null : <FrameInput text="Make your guess..." />}
        <FrameButton onClick={dispatch}>{buttonLabel}</FrameButton>
      </FrameContainer>
      <div style={{ padding: '3rem' }}>
        Framedl made by <Link href="https://warpcast.com/ds8">ds8</Link>
      </div>
    </div>
  );
}
