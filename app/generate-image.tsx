import fs from "fs";
import path from "path";
import { ReactNode } from "react";
import satori, { SatoriOptions, Font } from "satori";

import { GuessedGame } from "./game/game-service";

function readFont(name: string) {
  return fs.readFileSync(path.resolve(`./public/${name}`));
}

export const fonts: Font[] = [
  {
    name: "SpaceGrotesk",
    data: readFont("SpaceGrotesk-Regular.ttf"),
    weight: 400,
    style: "normal",
  },
  {
    name: "SpaceGrotesk",
    data: readFont("SpaceGrotesk-Bold.ttf"),
    weight: 700,
    style: "normal",
  },
  {
    name: "Inter",
    data: readFont("Inter-Regular.ttf"),
    weight: 400,
    style: "normal",
  },
  {
    name: "Inter",
    data: readFont("Inter-Medium.ttf"),
    weight: 500,
    style: "normal",
  },
  {
    name: "Inter",
    data: readFont("Inter-SemiBold.ttf"),
    weight: 600,
    style: "normal",
  },
  {
    name: "Inter",
    data: readFont("Inter-Bold.ttf"),
    weight: 700,
    style: "normal",
  },
];

export const options: SatoriOptions = {
  width: 1200,
  height: 628,
  fonts,
};

async function renderSvg(node: ReactNode) {
  return await satori(
    <div
      tw="flex items-stretch w-full h-full bg-white"
      style={{ fontFamily: "Inter" }}
    >
      {node}
    </div>,
    options
  );
}

const MAX_GUESSES = 6;
const CELL_W = 84;
const CELL_H = 84;

const KEY_CELL_W = 48;
const KEY_CELL_H = 58;

const KEYS: string[][] = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

function determineGameMessage(
  game: GuessedGame | undefined | null,
  share?: boolean
) {
  if (!game) {
    return "Let's play!";
  }
  if (game.status === "WON") {
    const attempts = game.guesses.length;
    let who = "You won";
    if (share) {
      if (game.userData?.displayName) {
        who = game.userData.displayName + " won";
      } else {
        who = "Won";
      }
    }
    return `${who} in ${attempts} attempts!`;
  }
  if (game.status === "LOST") {
    if (share) {
      return "No luck this time...";
    }
    return `The correct word was "${game.word.toUpperCase()}"`;
  }
  if (game.guesses.length === 0) {
    return "Start guessing...";
  }
  return "Keep guessing...";
}

export interface GenerateImageOptions {
  overlayMessage?: string | null;
  share?: boolean;
}

export async function generateImage(
  game: GuessedGame | undefined | null,
  options?: GenerateImageOptions
) {
  const { guesses, allGuessedCharacters } = game || { guesses: [] };
  const { overlayMessage, share } = options || {};

  const rows: ReactNode[] = [];
  for (let i = 0; i < MAX_GUESSES; i++) {
    const guess = guesses[i];
    const cells: ReactNode[] = [];
    for (let j = 0; j < 5; j++) {
      const letter = guess ? guess.characters[j] : undefined;
      let char = "";
      let color = "rgba(31, 21, 55, 0.87)";
      let backgroundColor = "white";
      let borderColor = "rgba(31, 21, 55, 0.24)";
      if (letter) {
        char = letter.character;
        if (letter.status === "CORRECT") {
          color = "white";
          backgroundColor = "green";
          borderColor = "green";
        } else if (letter.status === "WRONG_POSITION") {
          color = "white";
          backgroundColor = "orange";
          borderColor = "orange";
        } else {
          borderColor = "rgba(31, 21, 55, 0.84)";
        }
      }
      cells.push(
        <div
          key={j}
          tw="flex justify-center items-center text-5xl"
          style={{
            lineHeight: 1,
            fontWeight: 600,
            width: CELL_W,
            height: CELL_H,
            color,
            backgroundColor,
            border: "4px solid",
            borderColor,
          }}
        >
          {share ? "" : char.toUpperCase()}
        </div>
      );
    }
    rows.push(
      <div
        key={i}
        tw="flex justify-center items-center"
        style={{ gap: "0.5rem" }}
      >
        {cells}
      </div>
    );
  }

  // keyboard
  const keyboardRows = [];
  for (let i = 0; i < KEYS.length; i++) {
    const keys = KEYS[i]!;
    const keyCells: ReactNode[] = [];
    for (let j = 0; j < keys.length; j++) {
      const key = keys[j]!;
      const gc = allGuessedCharacters?.[key];
      const color =
        gc &&
        (gc.status === "CORRECT" ||
          gc.status === "WRONG_POSITION" ||
          gc.status === "INCORRECT")
          ? "white"
          : "rgb(31, 21, 55)";
      const backgroundColor =
        gc && gc.status === "CORRECT"
          ? "green"
          : gc && gc.status === "WRONG_POSITION"
          ? "orange"
          : gc && gc.status === "INCORRECT"
          ? "rgba(31, 21, 55, 0.84)"
          : "rgba(31, 21, 55, 0.12)";
      keyCells.push(
        <div
          key={j}
          tw="flex justify-center items-center rounded-md text-3xl"
          style={{
            fontWeight: 500,
            width: KEY_CELL_W,
            height: KEY_CELL_H,
            color,
            backgroundColor,
          }}
        >
          {key.toUpperCase()}
        </div>
      );
    }
    keyboardRows.push(
      <div key={i} tw="flex flex-row" style={{ gap: "0.5rem" }}>
        {keyCells}
      </div>
    );
  }

  const gameMessage = determineGameMessage(game, share);

  return renderSvg(
    <div tw="flex w-full h-full items-center justify-center relative">
      <div tw="flex w-full h-full items-stretch justify-between">
        <div
          tw="flex flex-col items-center justify-center p-12"
          style={{ gap: "0.5rem" }}
        >
          {rows}
        </div>
        <div
          tw="flex flex-col flex-1 py-20 px-8 border-l"
          style={{
            gap: "3rem",
            borderColor: "rgba(31, 21, 55, 0.2)",
            backgroundColor: "rgba(31, 21, 55, 0.04)",
          }}
        >
          <div
            tw="flex flex-col flex-1 items-center relative"
            style={{ gap: "1rem" }}
          >
            <div
              tw="flex text-5xl flex-wrap"
              style={{
                fontFamily: "SpaceGrotesk",
                fontWeight: 700,
                wordBreak: "break-all",
                color: "rgba(31, 21, 55, 0.87)",
              }}
            >
              Framedl {game?.date}
            </div>
            <div
              tw="flex text-4xl flex-wrap"
              style={{
                fontFamily: "SpaceGrotesk",
                fontWeight: 400,
                wordBreak: "break-all",
                color: "rgba(31, 21, 55, 0.64)",
              }}
            >
              {gameMessage}
            </div>
            {overlayMessage ? (
              <div
                tw="absolute flex items-center justify-center"
                style={{
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              >
                <div
                  tw="flex items-center justify-center flex-wrap text-white py-4 px-8 rounded-md text-4xl"
                  style={{
                    backgroundColor: "rgba(31, 21, 55, 0.84)",
                    wordBreak: "break-all",
                  }}
                >
                  {overlayMessage}
                </div>
              </div>
            ) : null}
          </div>
          <div
            tw="flex flex-col items-center justify-center"
            style={{ gap: "0.5rem" }}
          >
            {share ? null : keyboardRows}
          </div>
        </div>
      </div>
    </div>
  );
}
