import { GameState, Move } from '../client/src/store/gameState';

export type PendingGame = {
  chainId: number;
  gameId: string;
  creator: string;
  creatorSocketId: string;
};

export type GamePool = Record<string, PendingGame>;

export type UpdateGamePayload = { gameId: string; moves: Move[]; signature: string };
export type RequestGameStatePayload = { gameId: string };
export type GameStatePayload = GameState;
export type GamePoolJoinGamePayload = { gameId: string; joined: string; signature: string };
export type GamePoolGameMatched = { gameId: string };
type CommonWsInterface = {
  updateGame: (payload: UpdateGamePayload) => void;
  requestGameState: (payload: RequestGameStatePayload) => void;
  gameState: (payload: GameStatePayload) => void;
  'gamePool.joinGame': (payload: GamePoolJoinGamePayload) => void;
  'gamePool.gameMatched': (payload: GamePoolGameMatched) => void;
};

export type CreateGamePayload = Omit<PendingGame, 'creatorSocketId'>;
export type RemoveGamePayload = { chainId: number; gameId: string };
export type ServerWsInterface = CommonWsInterface & {
  // TODO: remove this `cb`?
  'gamePool.createGame': (payload: CreateGamePayload, cb: () => void) => void;
  'gamePool.removeGame': (payload: RemoveGamePayload) => void;
  'gamePool.requestGameList': (payload: { chainId: number }) => void;
};

export type ClientWsInterface = CommonWsInterface & {
  error: (message: string) => void;
  'gamePool.gameList': (gamePool: GamePool) => void;
};
