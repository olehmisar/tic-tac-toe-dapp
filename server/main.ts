import express from 'express';
import path from 'path';
import { Server } from 'socket.io';
import { ClientWsInterface, PendingGame, ServerWsInterface } from './types';

const app = express();
const buildPath = path.join(__dirname, '../client/dist');
app.use(express.static(buildPath));
app.use((req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

const port = process.env['PORT'] || 8000;
const server = app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

const io = new Server<ServerWsInterface, ClientWsInterface>(server, {
  path: '/api/socket',
  cors: {
    origin: '*',
  },
});

const gamePools: Record<number, Record<string, PendingGame>> = {};
io.on('connection', (socket) => {
  console.log(`a user connected ${socket.id}`);
  const emitGamePool = ({ chainId }: { chainId: number }) => {
    return io.to(chainId.toString()).emit('gamePool.gameList', gamePools[chainId] ?? {});
  };

  socket.on('gamePool.requestGameList', ({ chainId }) => {
    socket.join(chainId.toString());
    emitGamePool({ chainId });
  });

  socket.on('gamePool.createGame', (payload, cb) => {
    if (gamePools[payload.chainId]?.[payload.gameId]) {
      socket.emit('error', 'You cannot create more than two games');
      return;
    }
    (gamePools[payload.chainId] = gamePools[payload.chainId] ?? {})[payload.gameId] = {
      ...payload,
      creatorSocketId: socket.id,
    };
    socket.join(payload.gameId);
    console.log('new game', payload.gameId);
    emitGamePool({ chainId: payload.chainId });
    cb();
  });

  socket.on('gamePool.joinGame', ({ chainId, gameId }) => {
    const game = gamePools[chainId]?.[gameId];
    if (!game) {
      socket.emit('error', 'Game not found');
      return;
    }
    delete gamePools[chainId]?.[gameId];
    socket.join(gameId);
    io.to(game.creatorSocketId).emit('gameMatched', { gameId });
    socket.emit('gameMatched', { gameId });
    emitGamePool({ chainId });
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
