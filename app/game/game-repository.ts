import { db } from "./../db/db";
import { v4 as uuidv4 } from "uuid";

export interface UserData {
  displayName?: string;
  username?: string;
  bio?: string;
  profileImage?: string;
}

export interface Game {
  id: string;
  fid: number;
  date: string;
  guesses: string[];
  userData?: UserData;
}

export interface GameResult {
  won: boolean;
  guessCount: number;
  date: string;
}

export interface UserStats {
  id: string;
  fid: number;
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  maxStreak: number;
  currentStreak: number;
  lastGameWonDate?: string;
  winGuessCounts: Record<number, number>;
  last30: GameResult[];
}

export interface UserStatsSave extends Omit<UserStats, "id"> {
  id?: string;
}

export interface GameSave extends Omit<Game, "id"> {
  id?: string;
}

export interface GameRepository {
  save(game: GameSave): Promise<string>;
  loadByFidAndDate(fid: number, date: string): Promise<Game | null>;
  loadAllByFid(fid: number): Promise<Game[]>;
  loadById(id: string): Promise<Game | null>;
  saveStats(stats: UserStatsSave): Promise<UserStats>;
  loadStatsByFid(fid: number): Promise<UserStats | null>;
}

export class GameRepositoryImpl implements GameRepository {
  getKey({ fid, date }: { fid: number; date: string }): string {
    return `games/fid/${fid}/${date}`;
  }

  async save(game: GameSave): Promise<string> {
    const key = this.getKey(game);
    const newGame: Game = { ...game, id: game.id || uuidv4() };
    await Promise.all([
      db.set<Game>(key, newGame),
      db.set<string>(`games/id/${newGame.id}`, key),
    ]);
    return newGame.id;
  }

  async loadByFidAndDate(fid: number, date: string): Promise<Game | null> {
    const key = this.getKey({ fid, date });
    return await db.get<Game>(key);
  }

  async loadAllByFid(fid: number): Promise<Game[]> {
    return await db.getAll<Game>(`games/fid/${fid}/*`);
  }

  async loadById(id: string): Promise<Game | null> {
    const key = await db.get<string>(`games/id/${id}`);
    if (!key) {
      return null;
    }
    return await db.get<Game>(key);
  }

  async saveStats(stats: UserStatsSave): Promise<UserStats> {
    const key = `stats/fid/${stats.fid}`;
    const newStats = {
      ...stats,
      id: stats.id || uuidv4(),
    } as UserStats;
    await db.set<UserStats>(key, newStats);
    return newStats;
  }

  async loadStatsByFid(fid: number): Promise<UserStats | null> {
    const key = `stats/fid/${fid}`;
    return await db.get<UserStats>(key);
  }
}
