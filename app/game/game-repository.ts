import { db } from './../db/db';

export interface Game {
  id: string;
  fid: number;
  date: string;
  guesses: string[];
}

export interface GameSave extends Omit<Game, "id"> {
  id?: string;
}

export interface GameRepository {
  save(game: GameSave): Promise<string>;
  load(id: string): Promise<Game | undefined>;
  loadByFidAndDate(fid: number, date: string): Promise<Game | undefined>;
}

export class GameRepositoryImpl implements GameRepository {
  private readonly allGameKey = 'allGames';

  async save(game: GameSave): Promise<string> {
    const allGamesString = await db.get(this.allGameKey);
    const allGames = allGamesString ? JSON.parse(allGamesString) : [];
    const newGame = game.id 
      ? game
      : { ...game, id: Math.random().toString(36).substring(2) };
    if (game.id) {
      const index = allGames.findIndex((g: Game) => g.id === game.id);
      allGames[index] = newGame;
    } else {
      allGames.push(newGame);
    }
    await db.set(this.allGameKey, JSON.stringify(allGames));
    return newGame.id!;
  }

  async load(id: string): Promise<Game | undefined> {
    const allGamesString = await db.get(this.allGameKey);
    const allGames = allGamesString ? JSON.parse(allGamesString) : [];
    return allGames.find((game: Game) => game.id === id);
  }

  async loadByFidAndDate(fid: number, date: string): Promise<Game | undefined> {
    const allGamesString = await db.get(this.allGameKey);
    const allGames = allGamesString ? JSON.parse(allGamesString) : [];
    return allGames.find((game: Game) => game.fid === fid && game.date === date);
  }
}
