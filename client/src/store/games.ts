import { arrayify } from '@ethersproject/bytes';
import { message } from 'antd';
import { Signer } from 'ethers';
import { useEffect } from 'react';
import { TicTacToe } from '../../../typechain';
import { useSocketOn } from '../hooks/useSocketOn';
import { formatRPCError } from '../utils';
import { Move, useGameState } from './gameState';
import { useSocket } from './socket';

export const useGame = (ticTacToe: TicTacToe, gameId: string) => {
  const gameState = useGameState();
  const { socket } = useSocket();
  useSocketOn(socket, 'updateGame', async ({ gameId, moves, signature }) => {
    try {
      await gameState.validateAndStore(ticTacToe, gameId, { moves, opponentMovesSignature: signature });
    } catch (e) {
      message.error(formatRPCError(e));
      return;
    }
  });
  useSocketOn(socket, 'requestGameState', ({ gameId: gId }) => {
    const game = gameState.get(gameId);
    if (!game || gId !== gameId) {
      return;
    }
    socket.emit('gameState', game);
  });
  useSocketOn(socket, 'gameState', async (payload) => {
    try {
      await gameState.validateAndStore(ticTacToe, gameId, {
        moves: payload.state.moves,
        myMovesSignature: payload.state.opponentMovesSignature,
        opponentMovesSignature: payload.state.myMovesSignature,
      });
      message.info('Synced game state with opponent');
    } catch (e) {
      message.error(formatRPCError(e));
      return;
    }
  });
  useEffect(() => {
    socket.emit('requestGameState', { gameId });
  }, [socket, gameId]);

  const game = gameState.get(gameId);
  if (!game) {
    return undefined;
  }
  return {
    game,
    async makeMove(signer: Signer, move: Move) {
      const moves = [...game.state.moves, move];
      try {
        const myMovesSignature = await signer.signMessage(arrayify(await ticTacToe.encodeMoves(gameId, moves)));
        await gameState.validateAndStore(ticTacToe, gameId, { moves, myMovesSignature });
        socket.emit('updateGame', { gameId, moves, signature: myMovesSignature });
      } catch (e) {
        message.error(formatRPCError(e));
      }
    },
  };
};
