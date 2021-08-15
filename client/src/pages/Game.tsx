import { Alert, message } from 'antd';
import React, { FC } from 'react';
import { Board } from '../components/Board';
import { BrandButton } from '../components/BrandButton';
import { ConnectOr } from '../components/ConnectOr';
import { Result, useGame } from '../store/games';
import { useSocket } from '../store/socket';
import { formatRPCError } from '../utils';
import { NotFound } from './NotFound';

type Props = {
  gameId: string;
};
export const Game: FC<Props> = ({ gameId }) => {
  const state = useGame(gameId);
  const socket = useSocket();
  if (!state) {
    return <NotFound title="Game not found" />;
  }
  const { game, makeMove } = state;
  return (
    <ConnectOr>
      {({ provider, ticTacToe }) => (
        <>
          {game.result === Result.DRAW && <Alert message="It's a draw" type="warning" />}
          {game.result === Result.WON && (
            <>
              {game.winner === game.me ? (
                <Alert message="You won!" type="success" />
              ) : (
                <Alert message="You lost" type="error" />
              )}
            </>
          )}
          {game.result !== Result.IN_PROGRESS && (
            <BrandButton
              type="primary"
              onClick={async () => {
                try {
                  const tx = await ticTacToe.endGameWithMoves(
                    gameId,
                    game.moves,
                    game.myMovesSignature,
                    game.opponentMovesSignature,
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
          )}
          <fieldset disabled={game.result !== Result.IN_PROGRESS}>
            <Board
              game={game}
              onMove={async (i, j) => {
                const signer = provider.getSigner();
                await makeMove(signer, ticTacToe, { player: game.me, i, j });
              }}
            />
          </fieldset>
        </>
      )}
    </ConnectOr>
  );
};
