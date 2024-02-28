import fs from "fs";
import path from "path";
import { ReactNode } from "react";
import satori, { SatoriOptions, Font } from "satori";
import sharp from "sharp";

import { GuessedGame } from "./game/game-service";
import { UserStats, GameResult } from "./game/game-repository";
import { loadEmoji, getIconCode } from "./twemoji";

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

const emojiCache: Record<string, string> = {};

export const options: SatoriOptions = {
  width: 1200,
  height: 628,
  fonts,
  loadAdditionalAsset: async (_code: string, _segment: string) => {
    if (_code === "emoji") {
      const emojiCode = getIconCode(_segment);
      if (emojiCache[emojiCode]) {
        return emojiCache[emojiCode]!;
      }
      const svg = await loadEmoji("twemoji", getIconCode(_segment));
      const pngData = await sharp(Buffer.from(svg)).toFormat("png").toBuffer();
      const dataUrl = `data:image/png;base64,${pngData.toString("base64")}`;
      emojiCache[emojiCode] = dataUrl;
      return dataUrl;
    }
    return _code;
  },
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
    return `🎉 ${who} in ${attempts} attempts!`;
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

interface UserStatsPanelProps {
  stats: UserStats;
  currentGuessCount?: number;
}

function StatLabel(props: { label: string }) {
  return (
    <div
      tw="flex flex-wrap text-3xl"
      style={{ color: "rgba(31, 21, 55, 0.54)" }}
    >
      {props.label}
    </div>
  );
}

function StatValue(props: { value: string }) {
  return <div tw="flex flex-1">{props.value}</div>;
}

function StatItem(props: { label: string; value: string }) {
  return (
    <div
      tw="flex flex-col flex-1 items-center text-center flex-wrap"
      style={{ gap: "0.5rem" }}
    >
      <div tw="flex w-full justify-center" style={{ fontWeight: 500 }}>
        {props.value}
      </div>
      <div tw="flex w-full justify-center">
        <StatLabel label={props.label} />
      </div>
    </div>
  );
}

function StatGuessDistributionItem(props: {
  guessCount: number;
  amount: number;
  pctg: number;
  current: boolean;
}) {
  const { guessCount, amount, pctg, current } = props;
  return (
    <div tw="flex w-full text-3xl items-center">
      <div tw="flex w-8">{guessCount}</div>
      <div tw="flex flex-1">
        <div
          tw="flex text-white rounded px-2 py-1"
          style={{
            minWidth: `${pctg}%`,
            backgroundColor: current ? "green" : "rgba(31, 21, 55, 0.24)",
          }}
        >
          {amount}
        </div>
      </div>
    </div>
  );
}

const LAST_X_CELL_W = 52;
const LAST_X_CELL_H = 52;

// TODO this will display the latest stats always
function UserStatsPanel(props: UserStatsPanelProps) {
  const { stats, currentGuessCount } = props;
  const {
    totalGames,
    totalWins,
    totalLosses,
    currentStreak,
    maxStreak,
    winGuessCounts,
    last30,
  } = stats;

  // generate last 7
  const last30Map = last30.reduce((acc, g) => {
    acc[g.date] = g;
    return acc;
  }, {} as { [key: string]: GameResult });
  const last7 = [];
  const startDate = new Date();
  for (let i = 6; i >= 0; i--) {
    const currentDate = new Date(startDate.getTime() - i * 24 * 60 * 60 * 1000);
    const dateKey = currentDate.toISOString().split("T")[0]!;
    const result = last30Map[dateKey];
    last7.push(
      <div
        key={i}
        tw={`flex rounded items-center justify-center text-white text-4xl`}
        style={{
          fontWeight: 500,
          width: LAST_X_CELL_W,
          height: LAST_X_CELL_H,
          backgroundColor: result
            ? result.won
              ? "green"
              : "red"
            : "rgba(31, 21, 55, 0.24)",
        }}
      >
        {result ? (result.won ? result.guessCount : "X") : ""}
      </div>
    );
  }
  // guess distribution
  const distribution = [];
  const maxWinGuessCount = Object.keys(winGuessCounts).reduce(
    (acc, key) => Math.max(acc, winGuessCounts[parseInt(key, 10)] || 0),
    0
  );
  for (let i = 1; i <= 6; i++) {
    const amount = winGuessCounts[i] || 0;
    const pctg = maxWinGuessCount > 0 ? (100 * amount) / maxWinGuessCount : 0;
    distribution.push(
      <StatGuessDistributionItem
        key={i}
        guessCount={i}
        amount={amount}
        pctg={pctg}
        current={i === currentGuessCount}
      />
    );
  }
  //

  const totalFinished = totalWins + totalLosses;
  const winPctg =
    totalFinished > 0 ? ((100 * totalWins) / totalFinished).toFixed(0) : "N/A";
  return (
    <div
      tw="flex flex-col w-full text-5xl"
      style={{
        fontFamily: "Inter",
        color: "rgba(31, 21, 55, 0.87)",
        borderColor: "rgba(31, 21, 55, 0.2)",
      }}
    >
      <div
        tw="flex flex-row flex-wrap border-t py-8"
        style={{ gap: "1rem", borderColor: "rgba(33, 21, 55, 0.2)" }}
      >
        <StatItem label="Played" value={`${totalGames}`} />
        <StatItem label="Win %" value={winPctg} />
        <StatItem label="Current Streak" value={`${currentStreak}`} />
        <StatItem label="Max Streak" value={`${maxStreak}`} />
      </div>
      <div
        tw="flex flex-row w-full items-center justify-between border-t pt-8 px-4"
        style={{ gap: "1rem", borderColor: "rgba(33, 21, 55, 0.2)" }}
      >
        <div tw="flex">
          <StatLabel label="Last 7" />
        </div>
        <div tw="flex flex-row items-center" style={{ gap: "0.5rem" }}>
          {last7}
        </div>
      </div>
      {/* <div tw="flex flex-col w-full" style={{ gap: "0.5rem" }}>
        {distribution}
      </div> */}
    </div>
  );
}

export interface GenerateImageOptions {
  overlayMessage?: string | null;
  share?: boolean;
  userStats?: UserStats;
}

export async function generateImage(
  game: GuessedGame | undefined | null,
  options?: GenerateImageOptions
) {
  const { guesses, allGuessedCharacters } = game || { guesses: [] };
  const { overlayMessage, share, userStats } = options || {};

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
          color = "white";
          borderColor = "transparent";
          backgroundColor = share
            ? "rgba(31, 21, 55, 0.24)"
            : "rgba(31, 21, 55, 0.42)";
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
          ? "rgba(31, 21, 55, 0.42)"
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
          tw="flex flex-col flex-1 pt-20 px-8 border-l"
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
                fontFamily: "Inter",
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
          <div tw="flex flex-col items-center justify-center pb-12">
            {(game?.status === "WON" || game?.status === "LOST") &&
            userStats ? (
              <UserStatsPanel
                stats={userStats}
                currentGuessCount={
                  game.status === "WON" ? game.guesses.length : undefined
                }
              />
            ) : (
              !share && (
                <div
                  tw="flex flex-col items-center justify-center pb-8"
                  style={{ gap: "0.5rem" }}
                >
                  {keyboardRows}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
