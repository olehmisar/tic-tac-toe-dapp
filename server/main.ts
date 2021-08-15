import express from 'express';
import path from 'path';
import { Server } from 'socket.io';
import { ClientWsInterface, GamePool, ServerWsInterface } from './types';

const app = express();
const buildPath = path.join(__dirname, '../client/dist');
app.use(express.static(buildPath));
app.use((req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

const port = process.env.PORT || 8000;
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

  socket.on('createGame', (payload, cb) => {
    if (gamePool[payload.gameId]) {
      socket.emit('error', 'You cannot create more than two games');
      return;
    }
    gamePool[payload.gameId] = {
      ...payload,
      creatorSocketId: socket.id,
    };
    socket.join(payload.gameId);
    console.log('new game', payload.gameId);
    emitGamePool();
    cb();
  });

  socket.on('joinGame', ({ gameId, joined, joinedMovesSignature }) => {
    const game = gamePool[gameId];
    if (!game) {
      socket.emit('error', 'Game not found');
      return;
    }
    delete gamePool[gameId];
    socket.join(gameId);
    io.to(game.creatorSocketId).emit('gameMatched', {
      gameId,
      me: game.creator,
      myMovesSignature: game.creatorMovesSignature,
      opponent: joined,
      opponentMovesSignature: joinedMovesSignature,
    });
    socket.emit('gameMatched', {
      gameId,
      me: joined,
      myMovesSignature: joinedMovesSignature,
      opponent: game.creator,
      opponentMovesSignature: game.creatorMovesSignature,
    });
    emitGamePool();
  });

  socket.on('updateGame', (payload) => {
    socket.broadcast.to(payload.gameId).emit('updateGame', payload);
  });

  socket.on('requestGameState', (payload) => {
    socket.join(payload.gameId);
    return socket.broadcast.to(payload.gameId).emit('requestGameState', payload);
  });

  socket.on('gameState', (payload) => {
    return socket.broadcast.to(payload.gameId).emit('gameState', payload);
  });

  socket.on('disconnect', () => {
    console.log(`user disconnected ${socket.id}`);
  });
});
