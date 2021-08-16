import { message } from 'antd';
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import create from 'zustand';
import { combine } from 'zustand/middleware';
import {
  ClientWsInterface,
  CreateGamePayload,
  GamePool,
  JoinGamePayload,
  ServerWsInterface,
  UpdateGamePayload,
} from '../../../server/types';

const socket: Socket<ClientWsInterface, ServerWsInterface> = io('', { path: '/api/socket' });
let initialized = false;

export const useSocket = () => {
  const socketStore = useSocketStore();
  useEffect(() => {
    if (initialized) {
      return;
    }
    initialized = true;
    socket.on('connect', () => {
      console.log('WS connected');
    });
    socket.on('error', (err) => {
      message.error(err);
    });
    socket.on('gamePool', (gamePool) => {
      socketStore.setGamePool(gamePool);
    });
  });
  return {
    socket,
    gamePool: socketStore.gamePool,
    createGame(payload: CreateGamePayload) {
      socket.emit('createGame', payload, () => {
        message.success('Successfully created a game');
      });
    },
    joinGame(payload: JoinGamePayload) {
      socket.emit('joinGame', payload);
    },
    updateGame(payload: UpdateGamePayload) {
      socket.emit('updateGame', payload);
    },
  };
};

const useSocketStore = create(
  combine(
    {
      gamePool: {} as GamePool,
    },
    (set) => ({
      setGamePool(gamePool: GamePool) {
        set({ gamePool });
      },
    }),
  ),
);
