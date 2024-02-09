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
  originalGuesses: string[];
  guesses: Guess[];
  allGuessedCharacters: Record<string, GuessCharacter>;
  status: "IN_PROGRESS" | "WON" | "LOST";
  word: string;
}

export interface GameService {
  loadOrCreate(fid: number): Promise<GuessedGame>;
  load(id: string): Promise<GuessedGame | null>;
  guess(game: GuessedGame, guess: string): Promise<GuessedGame>;
  isValidGuess(guess: string): boolean;
  validateGuess(
    guess: string | null | undefined
  ): "VALID" | "INVALID_EMPTY" | "INVALID_SIZE" | "INVALID_FORMAT" | "INVALID_WORD";
}

const GUESS_PATTERN = /^[A-Za-z]{5}$/;

interface WordCharacter {
  count: number;
  positions: Record<number, boolean>;
}

const MAX_GUESSES = 6;

export class GameServiceImpl implements GameService {
  private readonly gameRepository: GameRepository = new GameRepositoryImpl();

  private toGuessCharacters(
    wordCharacters: Record<string, WordCharacter>,
    guess: string
  ): GuessCharacter[] {
    const characters: GuessCharacter[] = [];
    const charMap: Record<number, GuessCharacter> = {};
    const charCounts: Record<string, number> = {};
    // find correct first
    for (let i = 0; i < guess.length; i++) {
      const c = guess[i]!;
      const cc = wordCharacters[c];
      if (cc && cc.positions[i]) {
        charMap[i] = { character: c, status: "CORRECT" };
        charCounts[c] = (charCounts[c] || 0) + 1;
      }
    }
    // find the other positions
    for (let i = 0; i < guess.length; i++) {
      const c = guess[i]!;
      const cc = wordCharacters[c];
      if (cc) {
        if (!cc.positions[i]) {
          charCounts[c] = (charCounts[c] || 0) + 1;
          charMap[i] = {
            character: c,
            status: charCounts[c]! > cc.count ? "INCORRECT" : "WRONG_POSITION",
          };
        }
      } else {
        charMap[i] = { character: c, status: "INCORRECT" };
      }
    }
    for (let i = 0; i < guess.length; i++) {
      const c = charMap[i];
      if (c) {
        characters.push(c);
      } else {
        console.error("No character found for index", i, guess);
        characters.push({ character: guess[i]!, status: "INCORRECT" });
      }
    }
    return characters;
  }

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
      const characters = this.toGuessCharacters(wordCharacters, guess);
      for (let i = 0; i < characters.length; i++) {
        const gc = characters[i]!;
        const prevGuessedCharacters = allGuessedCharacters[gc.character];
        if (
          !prevGuessedCharacters ||
          prevGuessedCharacters.status === "INCORRECT" ||
          gc.status === "CORRECT"
        ) {
          allGuessedCharacters[gc.character] = gc;
        }
      }
      guesses.push({ characters });
    }

    const lastGuess = guesses[guesses.length - 1];
    const won =
      lastGuess &&
      lastGuess.characters.reduce(
        (acc, c) => acc && c.status === "CORRECT",
        true
      );

    return {
      ...game,
      originalGuesses: game.guesses,
      guesses,
      allGuessedCharacters,
      status: won
        ? "WON"
        : game.guesses.length >= MAX_GUESSES
        ? "LOST"
        : "IN_PROGRESS",
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
      return {
        id,
        fid,
        date: today,
        guesses: [],
        originalGuesses: [],
        allGuessedCharacters: {},
        status: "IN_PROGRESS",
        word: getWordForDate(today),
      };
    }
    return this.toGuessedGame(game, today);
  }

  async load(id: string): Promise<GuessedGame | null> {
    const game = await this.gameRepository.loadById(id);
    if (!game) {
      return null;
    }
    return this.toGuessedGame(game, game.date);
  }

  async guess(guessedGame: GuessedGame, guess: string): Promise<GuessedGame> {
    if (!this.isValidGuess(guess)) {
      throw new Error("Guess must be 5 letters");
    }
    const game = await this.gameRepository.loadByFidAndDate(
      guessedGame.fid,
      guessedGame.date
    );
    if (!game) {
      throw new Error(`Game not found: ${guessedGame.id}`);
    }
    const formattedGuess = guess.trim().toLowerCase();
    game.guesses.push(formattedGuess);
    const id = await this.gameRepository.save(game);
    return this.toGuessedGame({ ...game, id }, game.date);
  }

  validateGuess(guess: String | null | undefined) {
    if (!guess) {
      return "INVALID_EMPTY";
    }
    if (guess.length !== 5) {
      return "INVALID_SIZE";
    }
    const formattedGuess = guess.trim().toLowerCase();
    if (!GUESS_PATTERN.test(formattedGuess)) {
      return "INVALID_FORMAT";
    }
    if (!words.includes(formattedGuess)) {
      return "INVALID_WORD";
    }
    return "VALID";
  }

  isValidGuess(guess: string): boolean {
    return this.validateGuess(guess) === "VALID";
  }
}

export const gameService: GameService = new GameServiceImpl();
