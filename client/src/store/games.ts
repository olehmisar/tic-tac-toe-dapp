import { useHistory } from 'react-router-dom';
import create from 'zustand';
import { combine, persist } from 'zustand/middleware';

export type Game = {
  gameId: string;
  me: string;
  opponent: string;
};

export const useGames = () => {
  const { games, addGame } = useGamesStore();
  const history = useHistory();
  return {
    games,
    addGame,
    setCurrentGame(gameId: string) {
      history.push(`/play/${gameId}`);
    },
  };
};

const useGamesStore = create(
  persist(
    combine(
      {
        games: {} as Record<string, Game>,
      },
      (set, get) => ({
        addGame(game: Game) {
          set({ games: { ...get().games, [game.gameId]: game } });
        },
      }),
    ),
    { name: 'games' },
  ),
);
