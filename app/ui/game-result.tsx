"use client";
import { PublicGuessedGame } from "../game/game-service";
import { buildShareableResult } from "../game/game-utils";

export interface GameResultProps {
  game?: PublicGuessedGame | null;
  shareUrl?: string;
}

export default function GameResult({ game, shareUrl }: GameResultProps) {
  const handleShare = () => {
    const url = shareUrl || window.location.href;
    const { title, text } = buildShareableResult(game);
    const { navigator } = window;
    const fullText = `${title}\n\n${text}\n\n${url}`;
    if (navigator?.share) {
      navigator.share({ title, text: fullText });
    } else if (navigator?.clipboard) {
      navigator.clipboard.writeText(fullText);
      alert("Copied to clipboard");
    } else {
      alert("Sharing is not supported on this device!");
    }
  };

  return (
    <div className="w-64 flex flex-col items-center justify-center gap-6 text-primary-900">
      {!game && (
        <div className="w-full flex flex-col gap-1">
          <p className="w-full text-left text-2xl font-spaceBold">Framedl</p>
        </div>
      )}
      {game && (
        <div className="w-full flex flex-col gap-1 font-space">
          <p className="w-full text-left text-2xl py-1 font-spaceBold">
            Framedl {game.date}
          </p>
          <p className="w-full text-left text-xl">
            {game.status === "WON" ? "You won! 🎉" : "Better luck next time!"}
          </p>
          <p className="w-full text-left text-slate-600 leading-snug">
            {game.status === "WON" ? (
              <span>
                You found the word in {game.guesses.length}{" "}
                {game.guesses.length === 1 ? "attempt" : "attempts"}
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
        <div className="flex flex-col gap-1">
          {game.guesses.map((guess, i) => (
            <div key={i} className="flex gap-1">
              {guess.characters.map((letter, j) => (
                <div
                  key={j}
                  className={`w-12 h-12 flex items-center justify-center rounded font-bold text-2xl ${
                    letter.status === "CORRECT"
                      ? "bg-green-600 text-white"
                      : letter.status === "WRONG_POSITION"
                      ? "bg-orange-600 text-white"
                      : "bg-primary-950/40 text-white"
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
