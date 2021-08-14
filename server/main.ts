import express from 'express';
import { Server } from 'socket.io';
import { ClientWsInterface, GamePool, ServerWsInterface } from './types';

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

const gamePool: GamePool = {};
io.on('connection', (socket) => {
  console.log(`a user connected ${socket.id}`);

  const emitGamePool = () => io.emit('gamePool', gamePool);
  emitGamePool();

  socket.on('createGame', (creator, signature, cb) => {
    const gamePoolId = `Room: ${socket.id}`;
    if (gamePool[gamePoolId]) {
      socket.emit('error', 'You cannot create more than two games');
      return;
    }
    gamePool[gamePoolId] = {
      creator,
      signature,
      creatorSocketId: socket.id,
    };
    socket.join(gamePoolId);
    console.log('new game', gamePoolId);
    emitGamePool();
    cb(gamePoolId);
  });

  socket.on('joinGame', (gamePoolId, player, signature) => {
    const game = gamePool[gamePoolId];
    if (!game) {
      socket.emit('error', 'Game not found');
      return;
    }
    delete gamePool[gamePoolId];
    socket.join(gamePoolId);
    const creator = { address: game.creator, signature: game.signature };
    const joined = { address: player, signature };
    io.to(game.creatorSocketId).emit('gameMatched', gamePoolId, creator, joined);
    socket.emit('gameMatched', gamePoolId, joined, creator);
    emitGamePool();
  });

  socket.on('disconnect', () => {
    console.log(`user disconnected ${socket.id}`);
  });
});
