import { hexlify } from '@ethersproject/bytes';
import produce from 'immer';
import create from 'zustand';
import { combine, persist } from 'zustand/middleware';
import { TicTacToe } from '../../../typechain';

// TODO: remove this and fetch from blockchain instead?
export type Result = typeof Result[keyof typeof Result];
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Result = {
  IN_PROGRESS: 0,
  WON: 1,
  DRAW: 2,
} as const;

export type GameState = {
  gameId: string;
  me: string;
  opponent: string;
  state: {
    result: Result;
    winner: string;
    myMovesSignature: string;
    opponentMovesSignature: string;
    moves: Move[];
    lastPlayer: string;
    board: string[][];
  };
};

export type Move = {
  player: string;
  i: number;
  j: number;
};

export const useGameState = () => {
  const store = useGamesStore();
  return {
    async initialize(ticTacToe: TicTacToe, gameId: string) {
      if (store.has(gameId)) {
        throw new Error('Game is already initialized');
      }
      store.set(gameId, await newGame(ticTacToe, gameId));
    },
    async validateAndStore(
      ticTacToe: TicTacToe,
      gameId: string,
      payload: {
        moves: Move[];
        myMovesSignature?: string;
        opponentMovesSignature?: string;
      },
    ) {
      const game = store.get(gameId) ?? (await newGame(ticTacToe, gameId));
      if (game.state.moves.length > payload.moves.length) {
        throw new Error('Too few moves');
      }
      const myMovesSignature = payload.myMovesSignature ?? game.state.myMovesSignature;
      const opponentMovesSignature = payload.opponentMovesSignature ?? game.state.opponentMovesSignature;
      const { state, result, winner } = await ticTacToe.validateMoves(
        gameId,
        payload.moves,
        myMovesSignature,
        opponentMovesSignature,
      );
      store.set(
        gameId,
        produce(game, (g) => {
          g.state = {
            result: result as Result,
            winner,
            moves: payload.moves,
            myMovesSignature,
            opponentMovesSignature,
            lastPlayer: state.lastPlayer,
            board: state.board,
          };
        }),
      );
    },
    get(gameId: string) {
      return store.get(gameId);
    },
  };
};

async function newGame(ticTacToe: TicTacToe, gameId: string): Promise<GameState> {
  const { winner, result } = await ticTacToe.getGame(gameId);
  const [me, opponent] = await ticTacToe.validateMsgSender(gameId);
  const initialState = await ticTacToe.initialState(gameId);
  return {
    gameId,
    me,
    opponent,
    state: {
      result: result as Result,
      winner,
      myMovesSignature: hexlify(0),
      opponentMovesSignature: hexlify(0),
      moves: [],
      lastPlayer: initialState.lastPlayer,
      board: initialState.board,
    },
  };
}

// TODO: extract this to a hashmap?
const useGamesStore = create(
  persist(
    combine(
      {
        _games: {} as Record<string, GameState>,
      },
      (set_, get_) => ({
        get(gameId: string) {
          return get_()._games[gameId];
        },
        has(gameId: string) {
          return get_()._games[gameId] != null;
        },
        set(gameId: string, game: GameState) {
          set_({
            _games: produce(get_()._games, (games) => {
              games[gameId] = game;
            }),
          });
        },
      }),
    ),
    { name: 'games' },
  ),
);
