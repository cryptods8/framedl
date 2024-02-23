"use client";
import { PublicGuessedGame } from "../game/game-service";

export interface GameResultProps {
  game?: PublicGuessedGame | null;
  shareUrl?: string;
}

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

function buildShareableResult(
  game: PublicGuessedGame | null | undefined,
  shareUrl: string | undefined
) {
  const url = shareUrl || window.location.href;
  if (!game) {
    return {
      title: "Framedl",
      text: `Play Framedl!\n\n${url}`,
    };
  }
  const guessCount = game.status === "WON" ? `${game.guesses.length}` : "X";
  const title = `Framedl ${game.date} ${guessCount}/6`;
  const resultText = buildResultText(game);
  const text = `${title}\n\n${resultText}\n\n${url}`;
  return { title, text };
}

export default function GameResult({ game, shareUrl }: GameResultProps) {
  const handleShare = () => {
    const { title, text } = buildShareableResult(game, shareUrl);
    const { navigator } = window;
    if (navigator?.share) {
      navigator.share({ title, text });
    } else if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      alert("Copied to clipboard");
    } else {
      alert("Sharing is not supported on this device!");
    }
  };

  return (
    <div className="w-72 flex flex-col items-center justify-center gap-6 text-primary-900">
      {!game && (
        <div className="w-full flex flex-col gap-1">
          <p className="w-full text-left text-2xl font-spaceBold">Framedl</p>
        </div>
      )}
      {game && (
        <div className="w-full flex flex-col gap-1 font-space">
          <p className="w-full text-left text-2xl font-spaceBold">
            Framedl {game.date}
          </p>
          <p className="w-full text-left text-xl">
            {game.status === "WON" ? "You won! 🎉" : "Better luck next time!"}
          </p>
          <p className="w-full text-left text-slate-600">
            {game.status === "WON" ? (
              <span>
                You guessed the word in {game.guesses.length}{" "}
                {game.guesses.length === 1 ? "guess" : "guesses"}
              </span>
            ) : (
              <span>
                You ran out of guesses.{" "}
                {game.word && (
                  <span>
                    <span>The correct word was </span>
                    <span className="font-bold">{game.word.toUpperCase()}</span>
                  </span>
                )}
              </span>
            )}
          </p>
        </div>
      )}
      {game && (
        <div className="flex flex-col gap-2">
          {game.guesses.map((guess, i) => (
            <div key={i} className="flex gap-3">
              {guess.characters.map((letter, j) => (
                <div
                  key={j}
                  className={`w-12 h-12 flex items-center justify-center rounded font-bold text-lg ${
                    letter.status === "CORRECT"
                      ? "bg-green-600 text-white"
                      : letter.status === "WRONG_POSITION"
                      ? "bg-orange-600 text-white"
                      : "bg-white text-primary-900"
                  }`}
                >
                  {letter.character.toUpperCase()}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      <button
        className="bg-primary-800 w-full px-6 py-4 text-white font-bold rounded hover:bg-primary-900 active:bg-primary-950"
        onClick={handleShare}
      >
        Share
      </button>
    </div>
  );
}
