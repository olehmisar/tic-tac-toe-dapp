import { arrayify } from '@ethersproject/bytes';
import { AddressZero } from '@ethersproject/constants';
import { message } from 'antd';
import { Signer } from 'ethers';
import _ from 'lodash';
import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import create from 'zustand';
import { combine, persist } from 'zustand/middleware';
import { GameMatchedPayload, UpdateGamePayload } from '../../../server/types';
import { TicTacToe } from '../../../typechain';
import { formatRPCError } from '../utils';
import { useSocket } from './socket';
import { useWeb3Provider } from './web3';

export type Move = {
  player: string;
  i: number;
  j: number;
};

export type Game = {
  gameId: string;
  me: string;
  myMovesSignature: string;
  opponent: string;
  opponentMovesSignature: string;
  moves: Move[];
  state: {
    board: string[][];
  };
};

export const useGame = (gameId: string) => {
  const gamesStore = useGamesStore();
  const { state: web3 } = useWeb3Provider();
  const { socket } = useSocket();
  useEffect(() => {
    const listener = async ({ gameId, moves, signature }: UpdateGamePayload) => {
      const game = gamesStore.games[gameId];
      if (!web3) {
        message.error('Cannot update state. Not connected to blockchain');
        return;
      }
      if (!game) {
        message.error('Invalid game ID');
        return;
      }
      const { ticTacToe } = web3;
      try {
        const { state } = await ticTacToe.validateMoves(gameId, moves, game.myMovesSignature, signature);
        gamesStore.updateGame(
          { gameId, moves, myMovesSignature: game.myMovesSignature, opponentMovesSignature: signature },
          state.board,
        );
      } catch (e) {
        message.error(formatRPCError(e));
      }
    };
    socket.on('updateGame', listener);
    return () => {
      socket.off('updateGame', listener);
    };
  }, [gameId, gamesStore]);
  const game = gamesStore.games[gameId];
  if (!game) {
    return undefined;
  }
  return {
    game,
    async makeMove(signer: Signer, ticTacToe: TicTacToe, move: Move) {
      const moves = [...game.moves, move];
      try {
        const myMovesSignature = await signer.signMessage(arrayify(await ticTacToe.encodeMoves(gameId, moves)));
        const { state } = await ticTacToe.validateMoves(gameId, moves, myMovesSignature, game.opponentMovesSignature);
        gamesStore.updateGame(
          { gameId, moves, myMovesSignature, opponentMovesSignature: game.opponentMovesSignature },
          state.board,
        );
        socket.emit('updateGame', { gameId, moves, signature: myMovesSignature });
      } catch (e) {
        message.error(formatRPCError(e));
      }
    },
  };
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
        addGame(payload: GameMatchedPayload) {
          const game = {
            ...payload,
            moves: [],
            state: {
              // TODO: fetch board from blockchain
              board: _.times(3, () => _.times(3, _.constant(AddressZero))),
            },
          };
          set({ games: { ...get().games, [game.gameId]: game } });
        },
        updateGame(
          {
            gameId,
            moves,
            myMovesSignature,
            opponentMovesSignature,
          }: { gameId: string; moves: Move[]; myMovesSignature: string; opponentMovesSignature: string },
          board: string[][],
        ) {
          const game = get().games[gameId];
          if (!game) {
            message.error('Invalid game ID');
            return;
          }
          set({
            games: {
              ...get().games,
              [gameId]: {
                ...game,
                moves,
                myMovesSignature,
                opponentMovesSignature,
                state: {
                  board,
                },
              },
            },
          });
        },
      }),
    ),
    { name: 'games' },
  ),
);
