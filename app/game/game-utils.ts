import { PublicGuessedGame } from "./game-service";

function buildResultText(game: PublicGuessedGame) {
  return game.guesses
    .map((guess, i) => {
      return guess.characters
        .map((letter, j) => {
          return letter.status === "CORRECT"
            ? "🟩"
            : letter.status === "WRONG_POSITION"
            ? "🟨"
            : "⬜";
        })
        .join("");
    })
    .join("\n");
}

export function buildShareableResult(
  game: PublicGuessedGame | null | undefined
) {
  if (!game) {
    return {
      title: "Framedl",
      text: `Play Framedl!`,
    };
  }
  const guessCount = game.status === "WON" ? `${game.guesses.length}` : "X";
  const title = `Framedl ${game.date} ${guessCount}/6`;
  const text = buildResultText(game);
  return { title, text };
}
