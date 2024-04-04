import {
  GameRepository,
  GameRepositoryImpl,
  Game,
  UserData,
  UserStats,
  UserStatsSave,
  GameResult,
  LeaderboardEntry,
  Leaderboard,
} from "./game-repository";
import answers from "../words/answer-words";
import allWords from "../words/all-words";

const disqualifiedFids = (process.env.DISQUALIFIED_FIDS || "11124")
  .split(",")
  .map(Number);

const startingDate = new Date("2024-02-03");

const getWordForDate = (dateString: string): string => {
  const date = new Date(dateString);
  const days = Math.floor(
    (date.getTime() - startingDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  return answers[days % answers.length]!;
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

export interface PublicGuessedGame {
  id: string;
  date: string;
  guesses: Guess[];
  status: "IN_PROGRESS" | "WON" | "LOST";
  word?: string;
}

export type GuessValidationStatus =
  | "VALID"
  | "INVALID_EMPTY"
  | "INVALID_SIZE"
  | "INVALID_FORMAT"
  | "INVALID_WORD";

export interface GameService {
  loadOrCreate(fid: number, userData?: UserData): Promise<GuessedGame>;
  load(id: string): Promise<GuessedGame | null>;
  loadAllByFid(fid: number): Promise<GuessedGame[]>;
  loadPublic(id: string, personal: boolean): Promise<PublicGuessedGame | null>;
  guess(game: GuessedGame, guess: string): Promise<GuessedGame>;
  isValidGuess(guess: string): boolean;
  validateGuess(guess: string | null | undefined): GuessValidationStatus;
  loadStats(fid: number): Promise<UserStats | null>;
  loadLeaderboard(fid: number | null | undefined): Promise<PersonalLeaderboard>;
}

export interface PersonalLeaderboard extends Leaderboard {
  personalEntry?: LeaderboardEntry;
  personalEntryIndex?: number;
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
    const status = won
      ? "WON"
      : game.guesses.length >= MAX_GUESSES
      ? "LOST"
      : "IN_PROGRESS";
    return {
      ...game,
      originalGuesses: game.guesses,
      guesses,
      allGuessedCharacters,
      status,
      word,
    };
  }

  private getDayString(date: Date): string {
    return date.toISOString().split("T")[0]!;
  }

  async loadOrCreate(fid: number, userData?: UserData): Promise<GuessedGame> {
    const today = this.getDayString(new Date());
    const game = await this.gameRepository.loadByFidAndDate(fid, today);
    if (!game) {
      const newGame = {
        fid,
        date: today,
        guesses: [],
        userData,
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
        userData,
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

  async loadPublic(
    id: string,
    personal: boolean
  ): Promise<PublicGuessedGame | null> {
    const game = await this.gameRepository.loadById(id);
    if (!game) {
      return null;
    }
    const guessedGame = this.toGuessedGame(game, game.date);
    if (personal) {
      return guessedGame;
    }
    return {
      id: game.id,
      date: game.date,
      guesses: guessedGame.guesses.map((g) => {
        return {
          characters: g.characters.map((c) => {
            return { status: c.status, character: "" };
          }),
        };
      }),
      status: guessedGame.status,
    };
  }

  private async loadOrCreateStats(game: GuessedGame): Promise<UserStatsSave> {
    const stats = await this.gameRepository.loadStatsByFid(game.fid);
    if (stats) {
      return stats;
    }
    const allGames = await this.gameRepository.loadAllByFid(game.fid);
    const prevGames = allGames
      .map((g) => this.toGuessedGame(g, g.date))
      .filter(
        (g) => (g.status === "LOST" || g.status === "WON") && g.date < game.date
      );
    const emptyStats: UserStatsSave = {
      fid: game.fid,
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
      maxStreak: 0,
      currentStreak: 0,
      winGuessCounts: {},
      last30: [],
    };
    return prevGames.reduce((acc, g) => this.updateStats(acc, g), emptyStats);
  }

  async loadAllByFid(fid: number): Promise<GuessedGame[]> {
    const games = await this.gameRepository.loadAllByFid(fid);
    return games.map((g) => this.toGuessedGame(g, g.date));
  }

  private isPrevGameDate(currentDate: string, prevDate: string): boolean {
    const prev = new Date(prevDate);
    const next = new Date(prev.getTime() + 1000 * 60 * 60 * 24);
    return this.getDayString(next) === currentDate;
  }

  private updateStats(
    stats: UserStatsSave,
    guessedGame: GuessedGame
  ): UserStatsSave {
    const newStats = { ...stats };
    newStats.userData = guessedGame.userData;
    if (guessedGame.status === "WON") {
      newStats.totalWins++;
      const guessCount = guessedGame.guesses.length;
      newStats.winGuessCounts[guessCount] =
        (newStats.winGuessCounts[guessCount] || 0) + 1;
      if (
        stats.lastGameWonDate &&
        this.isPrevGameDate(guessedGame.date, stats.lastGameWonDate)
      ) {
        newStats.currentStreak++;
      } else {
        newStats.currentStreak = 1;
      }
      newStats.lastGameWonDate = guessedGame.date;
      newStats.maxStreak = Math.max(newStats.maxStreak, newStats.currentStreak);
    } else if (guessedGame.status === "LOST") {
      newStats.totalLosses++;
      newStats.currentStreak = 0;
    }
    newStats.totalGames++;
    newStats.last30.push({
      won: guessedGame.status === "WON",
      guessCount: guessedGame.guesses.length,
      date: guessedGame.date,
    });
    if (newStats.last30.length > 30) {
      newStats.last30.shift();
    }
    return newStats;
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
    const resultGame = this.toGuessedGame({ ...game, id }, game.date);
    if (resultGame.status === "LOST" || resultGame.status === "WON") {
      // update stats
      const stats = await this.loadOrCreateStats(guessedGame);
      const newStats = this.updateStats(stats, resultGame);
      // update leaderboard !!! POSSIBLE RACE CONDITION !!!
      const savedStats = await this.gameRepository.saveStats(newStats);
      const l = await this.loadLeaderboard(null);
      const updatedLeaderboard = await this.updateLeaderboard(savedStats, l);
      await this.gameRepository.saveLeaderboard(updatedLeaderboard);
    }
    return resultGame;
  }

  async loadStats(fid: number): Promise<UserStats | null> {
    return this.gameRepository.loadStatsByFid(fid);
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
    if (!allWords.includes(formattedGuess)) {
      return "INVALID_WORD";
    }
    return "VALID";
  }

  isValidGuess(guess: string): boolean {
    return this.validateGuess(guess) === "VALID";
  }

  private async toLeaderboardEntry(
    stats: UserStats,
    lastDate: string
  ): Promise<LeaderboardEntry> {
    const resultMap = stats.last30.reduce((acc, g) => {
      acc[g.date] = g;
      return acc;
    }, {} as Record<string, GameResult>);
    const toDate = resultMap[lastDate]
      ? new Date(lastDate)
      : new Date(new Date(lastDate).getTime() - 1000 * 60 * 60 * 24);
    const last14: GameResult[] = [];
    let lastPlayedDate: string | undefined = undefined;
    let totalGamesWon = 0;
    let totalGamesWonGuesses = 0;
    for (let i = 13; i >= 0; i--) {
      const date = new Date(toDate.getTime() - 1000 * 60 * 60 * 24 * i);
      const dateKey = this.getDayString(date);
      const result = resultMap[dateKey];
      if (result) {
        last14.push(result);
        if (result.won) {
          totalGamesWon++;
          totalGamesWonGuesses += result.guessCount;
        }
        lastPlayedDate = dateKey;
      }
    }
    let userData = stats.userData;
    if (!userData && lastPlayedDate) {
      const lastGame = await this.gameRepository.loadByFidAndDate(
        stats.fid,
        lastPlayedDate
      );
      userData = lastGame?.userData;
    }
    const maxGuesses = 14 * MAX_GUESSES * 1.5;
    const totalGuesses =
      totalGamesWonGuesses + MAX_GUESSES * 1.5 * (14 - totalGamesWon);
    const score = maxGuesses - totalGuesses;
    return {
      fid: stats.fid,
      totalGamesWon,
      totalGamesWonGuesses,
      lastDate: lastPlayedDate,
      last14,
      userData,
      score,
    };
  }

  private async enrichLeaderboard(
    l: Leaderboard,
    fid: number,
    loadStatsByFid: (fid: number) => Promise<UserStats | null | undefined>
  ): Promise<PersonalLeaderboard> {
    const personalEntryIndex = l.entries.findIndex((e) => e.fid === fid);
    if (personalEntryIndex !== -1) {
      const personalEntry = l.entries[personalEntryIndex];
      return {
        ...l,
        personalEntry,
        personalEntryIndex,
      };
    }
    const statsForFid = await loadStatsByFid(fid);
    if (statsForFid) {
      const personalEntry = await this.toLeaderboardEntry(statsForFid, l.date);
      return {
        ...l,
        personalEntry,
      };
    }
    return l;
  }

  private sortLeaderboardEntries(
    entries: LeaderboardEntry[]
  ): LeaderboardEntry[] {
    return [...entries].sort((a, b) => b.score - a.score).slice(0, 10);
  }

  private isFidDisqualified(fid: number): boolean {
    return disqualifiedFids.includes(fid);
  }

  private async updateLeaderboard(
    stats: UserStats,
    l: Leaderboard
  ): Promise<Leaderboard> {
    const entries = [...l.entries];
    const personalEntryIndex = entries.findIndex((e) => e.fid === stats.fid);
    const personalEntry = await this.toLeaderboardEntry(stats, l.date);
    if (this.isFidDisqualified(stats.fid)) {
      return l;
    }
    if (personalEntryIndex !== -1) {
      entries[personalEntryIndex] = personalEntry;
    } else {
      entries.push(personalEntry);
    }
    const lastDate = stats.last30[stats.last30.length - 1]?.date;
    return {
      ...l,
      date: lastDate && lastDate > l.date ? lastDate : l.date,
      entries: this.sortLeaderboardEntries(entries),
      lastUpdatedAt: Date.now(),
    };
  }

  async loadLeaderboard(
    fid: number | null | undefined
  ): Promise<PersonalLeaderboard> {
    const l = await this.gameRepository.loadLeaderboard();
    if (l) {
      if (fid == null) {
        return l;
      }
      return this.enrichLeaderboard(l, fid, this.gameRepository.loadStatsByFid);
    }
    const allStats = (await this.gameRepository.loadAllStats()).filter(
      (s) => !this.isFidDisqualified(s.fid)
    );
    const lastDate = allStats.reduce((acc, s) => {
      const last = s.last30[s.last30.length - 1]?.date;
      return last && last > acc ? last : acc;
    }, "2024-02-05");
    const entries = await Promise.all(
      allStats.map((s) => this.toLeaderboardEntry(s, lastDate))
    );
    const newLeaderboard = {
      date: lastDate,
      entries: this.sortLeaderboardEntries(entries),
      lastUpdatedAt: Date.now(),
    };
    await this.gameRepository.saveLeaderboard(newLeaderboard);
    if (fid == null) {
      return newLeaderboard;
    }
    return this.enrichLeaderboard(newLeaderboard, fid, (fid) =>
      Promise.resolve(allStats.find((s) => s.fid === fid))
    );
  }
}

export const gameService: GameService = new GameServiceImpl();
