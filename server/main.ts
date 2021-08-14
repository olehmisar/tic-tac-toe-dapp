import express from 'express';
import { Server } from 'socket.io';
import { ClientWsInterface, PendingGame, ServerWsInterface } from './types';

const app = express();
const port = 8000;
const server = app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

const io = new Server<ServerWsInterface, ClientWsInterface>(server, {
  cors: {
    origin: '*',
  },
});

let gameId = 0;
const gamePool: Record<number, PendingGame> = {};
io.on('connection', (socket) => {
  console.log('a user connected');
  socket.emit('gamePool', Object.fromEntries(Object.entries(gamePool).map(([id, game]) => [id, game.payload])));

  socket.on('createGame', (creator, signature) => {
    gamePool[gameId++] = {
      socket,
      payload: {
        creator,
        signature,
      },
    };

    console.log('new game', gameId - 1);
    socket.emit('gamePool', Object.fromEntries(Object.entries(gamePool).map(([id, game]) => [id, game.payload])));
  });

  socket.on('joinGame', (id, player, signature) => {
    const game = gamePool[id];
    delete gamePool[id];
    game.socket.emit('gameMatched', id, player, signature);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});
