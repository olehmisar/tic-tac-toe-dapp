import { AddressZero } from '@ethersproject/constants';
import { message } from 'antd';
import _ from 'lodash';
import { useHistory } from 'react-router-dom';
import create from 'zustand';
import { combine, persist } from 'zustand/middleware';
import { GameMatchedPayload } from '../../../server/types';
import { TicTacToe } from '../../../typechain';
import { formatRPCError } from '../utils';

export type Move = {
  player: string;
  i: number;
  j: number;
};

export type Game = {
  gameId: string;
  me: string;
  opponent: string;
  state: {
    moves: Move[];
    board: string[][];
  };
};

export const useGame = (gameId: string) => {
  const { games, updateGame } = useGamesStore();
  const game = games[gameId];
  if (!game) {
    return undefined;
  }
  return {
    game,
    async makeMove(ticTacToe: TicTacToe, move: Move) {
      const blockchainGame = await ticTacToe.getGame(gameId);
      const moves = [...game.state.moves, move];
      await ticTacToe
        .validateMoves(blockchainGame.player1, moves)
        .then(async ({ board }) => {
          updateGame(gameId, { moves, board });
        })
        .catch((e) => {
          message.error(formatRPCError(e));
        });
    },
  };
};

export const useGames = () => {
  const history = useHistory();
  return {
    ...useGamesStore(),
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
        addGame(payload: GameMatchedPayload) {
          const game = {
            ...payload,
            state: {
              moves: [],
              // TODO: fetch board from blockchain
              board: _.times(3, () => _.times(3, _.constant(AddressZero))),
            },
          };
          set({ games: { ...get().games, [game.gameId]: game } });
        },
        updateGame(gameId: string, data: Game['state']) {
          const game = get().games[gameId];
          if (!game) {
            return;
          }
          set({
            games: {
              ...get().games,
              [gameId]: {
                ...game,
                state: data,
              },
            },
          });
        },
      }),
    ),
    { name: 'games' },
  ),
);
