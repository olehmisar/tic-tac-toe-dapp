import { message } from 'antd';
import { io, Socket } from 'socket.io-client';
import create from 'zustand';
import { combine } from 'zustand/middleware';
import { ClientWsInterface, GamePool, ServerWsInterface } from '../../../server/types';

// TODO: refactor this file
const socket: Socket<ClientWsInterface, ServerWsInterface> = io('http://127.0.0.1:8000');

type Room = {
  gamePoolId: string;
  me: string;
  opponent: string;
};

export const useSocket = create(
  combine(
    {
      room: undefined as Room | undefined,
      gamePool: {} as GamePool,
      _initialized: false,
    },
    (set, get) => {
      return {
        initialize() {
          if (get()._initialized) {
            return;
          }
          set({ _initialized: true });
          socket.on('connect', () => {
            console.log('WS connected');
          });
          socket.on('error', (err) => {
            message.error(err);
          });
          socket.on('gamePool', (gamePool) => {
            set({ gamePool });
          });
          socket.on('gameMatched', (gamePoolId, me, opponent) => {
            set({ room: { gamePoolId, me: me.address, opponent: opponent.address } });
            message.success('Game started');
          });
        },
        createGame(creator: string, signature: string) {
          socket.emit('createGame', creator, signature, () => {
            message.success('Successfully created a game');
          });
        },
        joinGame(gamePoolId: string, player: string, signature: string) {
          socket.emit('joinGame', gamePoolId, player, signature);
        },
      };
    },
  ),
);
