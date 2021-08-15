import { Move } from '../client/src/store/games';

export type PendingGame = {
  gameId: string;
  creator: string;
  creatorMovesSignature: string;
  creatorSocketId: string;
};

export type GamePool = Record<string, PendingGame>;

export type UpdateGamePayload = { gameId: string; moves: Move[]; signature: string };
export type RequestGameStatePayload = { gameId: string };
export type GameStatePayload = {
  gameId: string;
  moves: Move[];
  me: string;
  myMovesSignature: string;
  opponent: string;
  opponentMovesSignature: string;
};
type CommonWsInterface = {
  updateGame: (payload: UpdateGamePayload) => void;
  requestGameState: (payload: RequestGameStatePayload) => void;
  gameState: (payload: GameStatePayload) => void;
};

export type CreateGamePayload = Pick<PendingGame, 'gameId' | 'creator' | 'creatorMovesSignature'>;
export type JoinGamePayload = { gameId: string; joined: string; joinedMovesSignature: string };
export type ServerWsInterface = CommonWsInterface & {
  // TODO: remove this `cb`?
  createGame: (payload: CreateGamePayload, cb: () => void) => void;
  joinGame: (payload: JoinGamePayload) => void;
};

export type GameMatchedPayload = {
  gameId: string;
  me: string;
  myMovesSignature: string;
  opponent: string;
  opponentMovesSignature: string;
};
export type ClientWsInterface = CommonWsInterface & {
  error: (message: string) => void;
  gameMatched: (payload: GameMatchedPayload) => void;
  gamePool: (gamePool: GamePool) => void;
};
