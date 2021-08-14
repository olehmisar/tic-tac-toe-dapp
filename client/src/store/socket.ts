import { message } from 'antd';
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import create from 'zustand';
import { combine } from 'zustand/middleware';
import { ClientWsInterface, GamePool, ServerWsInterface } from '../../../server/types';
import { useGames } from './games';

// TODO: refactor this file
const socket: Socket<ClientWsInterface, ServerWsInterface> = io('http://127.0.0.1:8000');
let initialized = false;

export const useSocket = () => {
  const socketStore = useSocketStore();
  const gamesStore = useGames();
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
    socket.on('gameMatched', (gamePoolId, me, opponent) => {
      gamesStore.addGame({ gamePoolId, me: me.address, opponent: opponent.address });
      gamesStore.setCurrentGame(gamePoolId);
      message.success('Game started');
    });
  });
  return {
    gamePool: socketStore.gamePool,
    createGame(creator: string, signature: string) {
      socket.emit('createGame', creator, signature, () => {
        message.success('Successfully created a game');
      });
    },
    joinGame(gamePoolId: string, player: string, signature: string) {
      socket.emit('joinGame', gamePoolId, player, signature);
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
