import { useHistory } from 'react-router-dom';
import create from 'zustand';
import { combine, persist } from 'zustand/middleware';

export type Game = {
  gamePoolId: string;
  me: string;
  opponent: string;
};

export const useGames = () => {
  const { games, addGame } = useGamesStore();
  const history = useHistory();
  return {
    games,
    addGame,
    setCurrentGame(gamePoolId: string) {
      history.push(`/play/${gamePoolId}`);
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
          set({ games: { ...get().games, [game.gamePoolId]: game } });
        },
      }),
    ),
    { name: 'games' },
  ),
);
