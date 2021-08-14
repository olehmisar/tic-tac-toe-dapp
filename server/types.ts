import { Move } from '../client/src/store/games';

export type PendingGame = {
  gameId: string;
  creator: string;
  creatorMovesSignature: string;
  creatorSocketId: string;
};

export type GamePool = Record<string, PendingGame>;

export type CreateGamePayload = Pick<PendingGame, 'gameId' | 'creator' | 'creatorMovesSignature'>;
export type JoinGamePayload = { gameId: string; joined: string; joinedMovesSignature: string };
export type UpdateGamePayload = { gameId: string; moves: Move[]; signature: string };
export type ServerWsInterface = {
  // TODO: remove this `cb`?
  createGame: (payload: CreateGamePayload, cb: () => void) => void;
  joinGame: (payload: JoinGamePayload) => void;
  updateGame: (payload: UpdateGamePayload) => void;
};

export type GameMatchedPayload = {
  gameId: string;
  me: string;
  myMovesSignature: string;
  opponent: string;
  opponentMovesSignature: string;
};
export type ClientWsInterface = {
  error: (message: string) => void;
  gameMatched: (payload: GameMatchedPayload) => void;
  gamePool: (gamePool: GamePool) => void;
  updateGame: (payload: UpdateGamePayload) => void;
};
