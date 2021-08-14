import { io, Socket } from 'socket.io-client';
import create from 'zustand';
import { combine } from 'zustand/middleware';
import { ClientWsInterface, GamePool, ServerWsInterface } from '../../../server/types';

// TODO: refactor this file
const socket: Socket<ClientWsInterface, ServerWsInterface> = io('http://127.0.0.1:8000');
socket.on('connect', () => {
  console.log('WS connected');
});

export const useSocket = create(
  combine(
    {
      socket,
      listening: false,
      gamePool: {} as GamePool,
    },
    (set, get) => {
      return {
        listenToGamePool() {
          if (get().listening) {
            return;
          }
          set({ listening: true });
          get().socket.on('gamePool', (gamePool) => {
            set({ gamePool });
          });
        },
        createGame(creator: string, signature: string) {
          get().socket.emit('createGame', creator, signature);
        },
        joinGame(gamePoolId: number, player: string, signature: string) {
          get().socket.emit('joinGame', gamePoolId, player, signature);
        },
      };
    },
  ),
);
