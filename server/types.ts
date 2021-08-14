export type PendingGame = {
  creator: string;
  signature: string;
  creatorSocketId: string;
};

export type GamePool = Record<string, PendingGame>;

export type ServerWsInterface = {
  createGame: (creator: string, signature: string, cb: (gamePoolId: string) => void) => void;
  joinGame: (gamePoolId: string, player: string, signature: string) => void;
};

export type ClientWsInterface = {
  error: (message: string) => void;
  gameMatched: (
    gamePoolId: string,
    me: { address: string; signature: string },
    opponent: { address: string; signature: string },
  ) => void;
  gamePool: (gamePool: GamePool) => void;
};
