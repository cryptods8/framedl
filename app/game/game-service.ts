import { GameRepository, GameRepositoryImpl, Game } from "./game-repository";
import words from "../words/word-list";

const startingDate = new Date("2024-02-03");

const getWordForDate = (dateString: string): string => {
  const date = new Date(dateString);
  const days = Math.floor(
    (date.getTime() - startingDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  return words[days % words.length]!;
};

export interface GuessCharacter {
  character: string;
  status: "CORRECT" | "WRONG_POSITION" | "INCORRECT";
}

export interface Guess {
  characters: GuessCharacter[];
}

export interface GuessedGame extends Omit<Game, "guesses"> {
  guesses: Guess[];
  allGuessedCharacters: Record<string, GuessCharacter>;
  status: "IN_PROGRESS" | "WON" | "LOST";
  word: string;
}

export interface GameService {
  loadOrCreate(fid: number): Promise<GuessedGame>;
  guess(game: GuessedGame, guess: string): Promise<GuessedGame>;
  isValidGuess(guess: string): boolean;
}

const GUESS_PATTERN = /^[A-Za-z]{5}$/;

interface WordCharacter {
  count: number;
  positions: Record<number, boolean>;
}

const MAX_GUESSES = 6;

export class GameServiceImpl implements GameService {
  private readonly gameRepository: GameRepository = new GameRepositoryImpl();

  private toGuessedGame(game: Game, dateString: string): GuessedGame {
    const word = getWordForDate(dateString);
    const wordCharacters = word.split("").reduce((acc, c, idx) => {
      if (!acc[c]) {
        acc[c] = { count: 0, positions: {} };
      }
      acc[c]!.count++;
      acc[c]!.positions[idx] = true;
      return acc;
    }, {} as Record<string, WordCharacter>);

    const allGuessedCharacters: Record<string, GuessCharacter> = {};
    const guesses: Guess[] = [];
    for (const guess of game.guesses) {
      const guessChars = guess.split("");
      const characters: GuessCharacter[] = [];
      const charCount: Record<string, number> = {};
      for (let i = 0; i < guessChars.length; i++) {
        const c = guessChars[i]!;
        charCount[c] = (charCount[c] || 0) + 1;
        
        const wc = wordCharacters[c];
        let gc: GuessCharacter;
        if (wc) {
          if (wc.positions[i]) {
            gc = { character: c, status: "CORRECT" };
          } else if (charCount[c]! <= wc.count) {
            gc = { character: c, status: "WRONG_POSITION" };
          } else {
            gc = { character: c, status: "INCORRECT" };
          }
        } else {
          gc = { character: c, status: "INCORRECT" };
        }
        characters.push(gc);
        const prevGuessedCharacters = allGuessedCharacters[c];
        if (!prevGuessedCharacters || prevGuessedCharacters.status === "INCORRECT" || gc.status === "CORRECT") {
          allGuessedCharacters[c] = gc;
        }
      }
      guesses.push({ characters });
    }

    const lastGuess = guesses[guesses.length - 1];
    const won = lastGuess && lastGuess.characters.reduce((acc, c) => acc && c.status === "CORRECT", true);

    return {
      ...game,
      guesses,
      allGuessedCharacters,
      status: won ? "WON" : game.guesses.length >= MAX_GUESSES ? "LOST" : "IN_PROGRESS",
      word,
    };
  }

  async loadOrCreate(fid: number): Promise<GuessedGame> {
    const today = new Date().toISOString().split("T")[0]!;
    const game = await this.gameRepository.loadByFidAndDate(fid, today);
    if (!game) {
      const newGame = {
        fid,
        date: today,
        guesses: [],
      };
      const id = await this.gameRepository.save(newGame);
      return { id, fid, date: today, guesses: [], allGuessedCharacters: {}, status: "IN_PROGRESS", word: getWordForDate(today) };
    }
    return this.toGuessedGame(game, today);
  }

  async guess(guessedGame: GuessedGame, guess: string): Promise<GuessedGame> {
    if (!this.isValidGuess(guess)) {
      throw new Error("Guess must be 5 letters");
    }
    const game = await this.gameRepository.loadByFidAndDate(guessedGame.fid, guessedGame.date);
    if (!game) {
      throw new Error(`Game not found: ${guessedGame.id}`);
    }
    const formattedGuess = guess.trim().toLowerCase();
    game.guesses.push(formattedGuess);
    const id = await this.gameRepository.save(game);
    return this.toGuessedGame({ ...game, id }, game.date);
  }

  isValidGuess(guess: string): boolean {
    return GUESS_PATTERN.test(guess.trim()) && words.includes(guess.trim().toLowerCase());
  }
}

export const gameService: GameService = new GameServiceImpl();
