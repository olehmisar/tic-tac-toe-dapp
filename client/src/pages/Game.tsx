import { Alert, message, Space } from 'antd';
import React, { FC } from 'react';
import { Await } from '../components/Await';
import { Board } from '../components/Board';
import { BrandButton } from '../components/BrandButton';
import { RequestGameEndWithTimeout } from '../components/RequestGameEndWithTimeout';
import { useGame } from '../store/games';
import { Result, useGameState } from '../store/gameState';
import { Web3State } from '../store/web3';
import { formatRPCError } from '../utils';
import { NotFound } from './NotFound';

type Props = {
  gameId: string;
  web3: Web3State;
};
export const Game: FC<Props> = ({ gameId, web3: { ticTacToe, provider } }) => {
  const state = useGame(ticTacToe, gameId);
  const gameState = useGameState();
  if (!state) {
    return (
      <NotFound
        title="Game not found"
        extra={
          <Space>
            If you believe that this game exists, you can
            <BrandButton
              onClick={async () => {
                try {
                  await gameState.initialize(ticTacToe, gameId);
                  message.success('Successfully initialized a new game state');
                } catch (e) {
                  message.error(formatRPCError(e));
                  return;
                }
              }}
            >
              Try to initialize this game
            </BrandButton>
          </Space>
        }
      />
    );
  }
  const { game, makeMove } = state;
  return (
    <Space direction="vertical">
      {game.state.result === Result.DRAW && <Alert message="It's a draw" type="warning" />}
      {game.state.result === Result.WON && (
        <>
          {game.state.winner === game.me ? (
            <Alert message="You won!" type="success" />
          ) : (
            <Alert message="You lost" type="error" />
          )}
        </>
      )}
      {game.state.result !== Result.IN_PROGRESS && (
        <Await promise={ticTacToe.getGame(gameId)}>
          {(blockchainGame) =>
            blockchainGame.result === Result.IN_PROGRESS && (
              <BrandButton
                type="primary"
                onClick={async () => {
                  try {
                    const tx = await ticTacToe.endGameWithMoves(
                      gameId,
                      game.state.moves,
                      game.state.myMovesSignature,
                      game.state.opponentMovesSignature,
                    );
                    await tx.wait();
                    message.success('Data committed successfully');
                  } catch (e) {
                    message.error(formatRPCError(e));
                  }
                }}
              >
                Commit data to blockchain
              </BrandButton>
            )
          }
        </Await>
      )}
      {game.state.result === Result.IN_PROGRESS && <RequestGameEndWithTimeout game={game} />}
      <fieldset disabled={game.state.result !== Result.IN_PROGRESS}>
        <Board
          game={game}
          onMove={async (i, j) => {
            const signer = provider.getSigner();
            await makeMove(signer, { player: game.me, i, j });
          }}
        />
      </fieldset>
    </Space>
  );
};
