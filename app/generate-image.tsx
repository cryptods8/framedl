import * as fs from "fs";
import { ReactNode } from "react";
import { join } from "path";
import satori from "satori";

import { GuessedGame } from "./game/game-service";

const interRegPath = join(process.cwd(), "public/Inter-Regular.ttf");
let interReg = fs.readFileSync(interRegPath);

async function renderSvg(node: ReactNode) {
  return await satori(
    <div
      style={{
        display: "flex", // Use flex layout
        flexDirection: "row", // Align items horizontally
        alignItems: "stretch", // Stretch items to fill the container height
        width: "100%",
        height: "100vh", // Full viewport height
        backgroundColor: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          lineHeight: 1.2,
          padding: "0.5rem",
          fontSize: 36,
          color: "rgb(31, 21, 55)",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {node}
      </div>
    </div>,
    {
      width: 1146,
      height: 600,
      fonts: [
        {
          name: "Inter",
          data: interReg,
          weight: 400,
          style: "normal",
        },
      ],
    }
  );
}

const MAX_GUESSES = 6;
const CELL_W = 72;
const CELL_H = 72;

const KEY_CELL_W = 56;
const KEY_CELL_H = 56;

const KEYS: string[][] = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

export async function generateImage(
  game: GuessedGame | undefined,
  overlayMessage?: string
) {
  const { guesses, allGuessedCharacters } = game || { guesses: [] };

  const rows: ReactNode[] = [];
  for (let i = 0; i < MAX_GUESSES; i++) {
    const guess = guesses[i];
    const cells: ReactNode[] = [];
    for (let j = 0; j < 5; j++) {
      const letter = guess ? guess.characters[j] : undefined;
      let char = "";
      let color = "rgb(31, 21, 55)";
      let backgroundColor = "white";
      let borderColor = "#ccc";
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
          borderColor = "rgb(31, 21, 55)";
        }
      }
      cells.push(
        <div
          key={j}
          style={{
            width: CELL_W,
            height: CELL_H,
            color,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor,
            border: "4px solid",
            borderColor,
          }}
        >
          {char.toUpperCase()}
        </div>
      );
    }
    rows.push(
      <div
        key={i}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "0.5rem",
        }}
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
      keyCells.push(
        <div
          key={j}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: KEY_CELL_W,
            height: KEY_CELL_H,
            borderRadius: "0.5rem",
            fontSize: "2rem",
            color:
              gc &&
              (gc.status === "CORRECT" ||
                gc.status === "WRONG_POSITION" ||
                gc.status === "INCORRECT")
                ? "white"
                : "rgb(31, 21, 55)",
            backgroundColor:
              gc && gc.status === "CORRECT"
                ? "green"
                : gc && gc.status === "WRONG_POSITION"
                ? "orange"
                : gc && gc.status === "INCORRECT"
                ? "gray"
                : "#f0f0f0",
          }}
        >
          {key.toUpperCase()}
        </div>
      );
    }
    keyboardRows.push(
      <div
        key={i}
        style={{ display: "flex", flexDirection: "row", gap: "0.25rem" }}
      >
        {keyCells}
      </div>
    );
  }

  return renderSvg(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          columnGap: "3rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {rows}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.25rem",
          }}
        >
          {keyboardRows}
        </div>
      </div>
      {overlayMessage ? (
        <div
          style={{
            position: "absolute",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "3rem",
            padding: "1rem 2rem",
            color: "white",
            backgroundColor: "rgba(31, 21, 55, 0.84)",
            borderRadius: "1rem",
          }}
        >
          {overlayMessage}
        </div>
      ) : null}
    </div>
  );
}
