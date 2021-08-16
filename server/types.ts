import { GameState, Move } from '../client/src/store/gameState';

export type PendingGame = {
  chainId: number;
  gameId: string;
  creator: string;
  creatorGameStartSignature: string;
  creatorSocketId: string;
};

export type GamePool = Record<string, PendingGame>;

export type UpdateGamePayload = { gameId: string; moves: Move[]; signature: string };
export type RequestGameStatePayload = { gameId: string };
export type GameStatePayload = GameState;
type CommonWsInterface = {
  updateGame: (payload: UpdateGamePayload) => void;
  requestGameState: (payload: RequestGameStatePayload) => void;
  gameState: (payload: GameStatePayload) => void;
};

export type CreateGamePayload = Omit<PendingGame, 'creatorSocketId'>;
export type JoinGamePayload = { chainId: number; gameId: string };
export type RemoveGamePayload = { chainId: number; gameId: string };
export type ServerWsInterface = CommonWsInterface & {
  // TODO: remove this `cb`?
  'gamePool.createGame': (payload: CreateGamePayload, cb: () => void) => void;
  'gamePool.joinGame': (payload: JoinGamePayload) => void;
  'gamePool.removeGame': (payload: RemoveGamePayload) => void;
  'gamePool.requestGameList': (payload: { chainId: number }) => void;
};

export type GameMatchedPayload = { gameId: string };
export type ClientWsInterface = CommonWsInterface & {
  error: (message: string) => void;
  gameMatched: (payload: GameMatchedPayload) => void;
  'gamePool.gameList': (gamePool: GamePool) => void;
};
