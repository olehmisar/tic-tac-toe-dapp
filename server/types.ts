export type PendingGame = {
  gameId: string;
  creator: string;
  signature: string;
  creatorSocketId: string;
};

export type GamePool = Record<string, PendingGame>;

export type CreateGamePayload = Pick<PendingGame, 'gameId' | 'creator' | 'signature'>;
export type JoinGamePayload = { gameId: string; joined: string; signature: string };
export type ServerWsInterface = {
  // TODO: remove this `cb`?
  createGame: (payload: CreateGamePayload, cb: () => void) => void;
  joinGame: (payload: JoinGamePayload) => void;
};

export type GameMatchedPayload = {
  gameId: string;
  me: string;
  opponent: string;
};
export type ClientWsInterface = {
  error: (message: string) => void;
  gameMatched: (payload: GameMatchedPayload) => void;
  gamePool: (gamePool: GamePool) => void;
};
