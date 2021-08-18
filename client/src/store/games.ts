import { arrayify } from '@ethersproject/bytes';
import { message } from 'antd';
import { Signer } from 'ethers';
import { useEffect } from 'react';
import { useSocketOn } from '../hooks/useSocketOn';
import { formatRPCError } from '../utils';
import { Move, useGameState } from './gameState';
import { useSocket } from './socket';
import { Web3State } from './web3';

export const useGame = (web3: Web3State, gameId: string) => {
  const gameState = useGameState();
  const { socket } = useSocket();
  useSocketOn(socket, 'gameState.requestGameState', ({ gameId }) => {
    const game = gameState.get(gameId);
    if (!game) {
      return;
    }
    socket.emit('gameState.gameState', game);
  });
  useSocketOn(socket, 'gameState.gameState', async (payload) => {
    try {
      await gameState.validateAndStore(web3, gameId, {
        moves: payload.state.moves,
        myMovesSignature: payload.state.opponentMovesSignature,
        opponentMovesSignature: payload.state.myMovesSignature,
        opponentResultSignature: payload.state.myResultSignature,
      });
      message.info('Synced game state with opponent');
    } catch (e) {
      message.error(formatRPCError(e));
      return;
    }
  });
  useEffect(() => {
    socket.emit('gameState.requestGameState', { gameId });
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
        const myMovesSignature = await signer.signMessage(arrayify(await web3.ticTacToe.encodeMoves(gameId, moves)));
        const newState = await gameState.validateAndStore(web3, gameId, { moves, myMovesSignature });
        socket.emit('gameState.gameState', newState);
      } catch (e) {
        message.error(formatRPCError(e));
      }
    },
  };
};
