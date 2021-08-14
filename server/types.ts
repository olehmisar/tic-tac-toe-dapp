import { Socket } from 'socket.io';

export type PendingGame = {
  socket: Socket<ServerWsInterface, ClientWsInterface>;
  payload: {
    creator: string;
    signature: string;
  };
};

export type GamePool = Record<number, PendingGame['payload']>;

export type ServerWsInterface = {
  createGame: (creator: string, signature: string) => void;
  joinGame: (gamePoolId: number, player: string, signature: string) => void;
};

export type ClientWsInterface = {
  gameMatched: (gamePoolId: number, opponent: string, signature: string) => void;
  gamePool: (gamePool: GamePool) => void;
};
