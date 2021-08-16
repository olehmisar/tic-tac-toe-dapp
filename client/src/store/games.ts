import { arrayify } from '@ethersproject/bytes';
import { message } from 'antd';
import { Signer } from 'ethers';
import { useEffect } from 'react';
import { GameStatePayload, RequestGameStatePayload, UpdateGamePayload } from '../../../server/types';
import { TicTacToe } from '../../../typechain';
import { formatRPCError } from '../utils';
import { Move, useGameState } from './gameState';
import { useSocket } from './socket';

export const useGame = (ticTacToe: TicTacToe, gameId: string) => {
  const gameState = useGameState();
  const { socket } = useSocket();
  useEffect(() => {
    const updateGameListener = async ({ gameId, moves, signature }: UpdateGamePayload) => {
      try {
        await gameState.validateAndStore(ticTacToe, gameId, { moves, opponentMovesSignature: signature });
      } catch (e) {
        message.error(formatRPCError(e));
        return;
      }
    };
    const requestGameStateListener = ({ gameId: gId }: RequestGameStatePayload) => {
      const game = gameState.get(gameId);
      if (!game || gId !== gameId) {
        return;
      }
      socket.emit('gameState', game);
    };
    const gameStateListener = async (payload: GameStatePayload) => {
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
    };
    socket.on('updateGame', updateGameListener);
    socket.on('requestGameState', requestGameStateListener);
    socket.on('gameState', gameStateListener);
    return () => {
      socket.off('updateGame', updateGameListener);
      socket.off('requestGameState', requestGameStateListener);
      socket.off('gameState', gameStateListener);
    };
  }, [socket, gameState, ticTacToe, gameId]);

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
