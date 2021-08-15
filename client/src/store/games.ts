import { arrayify } from '@ethersproject/bytes';
import { AddressZero } from '@ethersproject/constants';
import { message } from 'antd';
import { Signer } from 'ethers';
import _ from 'lodash';
import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import create from 'zustand';
import { combine, persist } from 'zustand/middleware';
import {
  GameMatchedPayload,
  GameStatePayload,
  RequestGameStatePayload,
  UpdateGamePayload,
} from '../../../server/types';
import { TicTacToe } from '../../../typechain';
import { formatRPCError } from '../utils';
import { useSocket } from './socket';
import { useWeb3Provider } from './web3';

export type Move = {
  player: string;
  i: number;
  j: number;
};

export type Result = typeof Result[keyof typeof Result];
export const Result = {
  IN_PROGRESS: 0,
  WON: 1,
  DRAW: 2,
} as const;

export type Game = {
  gameId: string;
  me: string;
  myMovesSignature: string;
  opponent: string;
  opponentMovesSignature: string;
  moves: Move[];
  result: Result;
  winner: string;
  state: {
    board: string[][];
  };
};

async function validateMoves({
  ticTacToe,
  gameId,
  moves,
  myMovesSignature,
  opponentMovesSignature,
  game,
  updateState,
}: {
  ticTacToe: TicTacToe;
  gameId: string;
  moves: Move[];
  myMovesSignature: string;
  opponentMovesSignature: string;
  game?: Game;
  updateState: (
    gameId: string,
    payload: Pick<Game, 'moves' | 'myMovesSignature' | 'opponentMovesSignature' | 'result' | 'winner'>,
    board: string[][],
  ) => void;
}) {
  if (game && game.moves.length > moves.length) {
    throw new Error('Too few moves');
  }
  const { state, result, winner } = await ticTacToe.validateMoves(
    gameId,
    moves,
    myMovesSignature,
    opponentMovesSignature,
  );
  updateState(
    gameId,
    { moves, myMovesSignature, opponentMovesSignature, result: result as Result, winner },
    state.board,
  );
}

export const useGame = (gameId: string) => {
  const gamesStore = useGamesStore();
  const { state: web3 } = useWeb3Provider();
  const { socket } = useSocket();
  useEffect(() => {
    const updateGameListener = async ({ gameId, moves, signature }: UpdateGamePayload) => {
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
        await validateMoves({
          ticTacToe,
          gameId,
          moves,
          myMovesSignature: game.myMovesSignature,
          opponentMovesSignature: signature,
          game,
          updateState: gamesStore.updateGame,
        });
      } catch (e) {
        message.error(formatRPCError(e));
      }
    };
    const requestGameStateListener = ({ gameId }: RequestGameStatePayload) => {
      const game = gamesStore.games[gameId];
      if (!game) {
        return;
      }
      socket.emit('gameState', {
        gameId: game.gameId,
        moves: game.moves,
        me: game.opponent,
        myMovesSignature: game.opponentMovesSignature,
        opponent: game.me,
        opponentMovesSignature: game.myMovesSignature,
      });
    };
    const gameStateListener = async (payload: GameStatePayload) => {
      if (!web3) {
        message.error('Cannot update state. Not connected to blockchain');
        return;
      }
      if (!gamesStore.games[payload.gameId]) {
        gamesStore.addGame({
          gameId: payload.gameId,
          me: payload.me,
          opponent: payload.opponent,
          myMovesSignature: payload.myMovesSignature,
          opponentMovesSignature: payload.opponentMovesSignature,
        });
        message.info('Loaded game state from opponent');
      }

      const { ticTacToe } = web3;
      try {
        await validateMoves({
          ticTacToe,
          gameId: payload.gameId,
          moves: payload.moves,
          myMovesSignature: payload.myMovesSignature,
          opponentMovesSignature: payload.opponentMovesSignature,
          game,
          updateState: gamesStore.updateGame,
        });
      } catch (e) {
        message.error(formatRPCError(e));
      }
    };
    socket.on('updateGame', updateGameListener);
    socket.on('requestGameState', requestGameStateListener);
    socket.on('gameState', gameStateListener);
    return () => {
      socket.off('updateGame', updateGameListener);
      socket.off('requestGameState', requestGameStateListener);
      socket.off('gameState', gameStateListener);
    };
  }, [gameId, gamesStore, web3]);

  useEffect(() => {
    socket.emit('requestGameState', { gameId });
  }, [gameId, web3]);

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
        await validateMoves({
          ticTacToe,
          gameId,
          moves,
          myMovesSignature,
          opponentMovesSignature: game.opponentMovesSignature,
          game,
          updateState: gamesStore.updateGame,
        });
        socket.emit('updateGame', { gameId, moves, signature: myMovesSignature });
      } catch (e) {
        message.error(formatRPCError(e));
      }
    },
  };
};

export const useGames = () => {
  const { addGame } = useGamesStore();
  const history = useHistory();
  return {
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
            result: Result.IN_PROGRESS,
            winner: AddressZero,
            state: {
              // TODO: fetch board from blockchain
              board: _.times(3, () => _.times(3, _.constant(AddressZero))),
            },
          };
          set({ games: { ...get().games, [game.gameId]: game } });
        },
        updateGame(
          gameId: string,
          payload: Pick<Game, 'moves' | 'myMovesSignature' | 'opponentMovesSignature' | 'result' | 'winner'>,
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
                ...payload,
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
