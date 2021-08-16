import { Alert, message, Space } from 'antd';
import React, { FC } from 'react';
import { GameState } from '../store/gameState';
import { formatRPCError } from '../utils';
import { Await } from './Await';
import { BrandButton } from './BrandButton';
import { ConnectOr } from './ConnectOr';

type Props = {
  game: GameState;
};
export const RequestGameEndWithTimeout: FC<Props> = ({ game }) => {
  return (
    <ConnectOr>
      {({ ticTacToe }) => (
        <Await
          promise={Promise.all([
            ticTacToe.getEndGameWithTimeoutRequest(game.gameId),
            ticTacToe.GAME_END_TIMEOUT(),
            ticTacToe.REQUEST_END_GAME(),
          ])}
        >
          {([request, GAME_END_TIMEOUT, REQUEST_END_GAME]) => {
            return (
              <>
                {request.kind !== REQUEST_END_GAME ? (
                  <BrandButton
                    disabled={game.state.lastPlayer === game.opponent || game.state.moves.length < 2}
                    onClick={async () => {
                      try {
                        await ticTacToe.requestGameEndWithTimeout(
                          game.gameId,
                          game.state.moves,
                          game.state.myMovesSignature,
                          game.state.opponentMovesSignature,
                        );
                      } catch (e) {
                        message.error(formatRPCError(e));
                      }
                    }}
                  >
                    Request game end in {GAME_END_TIMEOUT.div(60).toString()} minutes
                  </BrandButton>
                ) : request.requester === game.me ? (
                  <Space direction="vertical">
                    <Alert
                      type="success"
                      message={
                        <>
                          Success. You will be able to end the game in{' '}
                          {/* TODO: use `getBlock('latest').timestamp` instead of `Date.now()` */}
                          {request.createdAt
                            .add(GAME_END_TIMEOUT)
                            .sub(Math.floor(Date.now() / 1000))
                            .div(60)
                            .toString()}{' '}
                          minutes
                        </>
                      }
                    />
                    <BrandButton
                      // TODO: use `getBlock('latest').timestamp` instead of `Date.now()`
                      disabled={request.createdAt.add(GAME_END_TIMEOUT).gt(Math.floor(Date.now() / 1000))}
                      onClick={async () => {
                        try {
                          await ticTacToe.endGameWithTimeout(game.gameId);
                        } catch (e) {
                          message.error(formatRPCError(e));
                        }
                      }}
                    >
                      End game
                    </BrandButton>
                  </Space>
                ) : (
                  <Space direction="vertical">
                    <Alert
                      type="warning"
                      message={
                        <>
                          Your opponent requested game end. It will be fulfilled in{' '}
                          {/* TODO: use `getBlock('latest').timestamp` instead of `Date.now()` */}
                          {request.createdAt
                            .add(GAME_END_TIMEOUT)
                            .sub(Math.floor(Date.now() / 1000))
                            .div(60)
                            .toString()}{' '}
                          minutes
                        </>
                      }
                    />
                    <BrandButton
                      onClick={async () => {
                        try {
                          await ticTacToe.cancelGameEndWithTimeoutRequest(
                            game.gameId,
                            game.state.moves,
                            game.state.myMovesSignature,
                            game.state.opponentMovesSignature,
                          );
                        } catch (e) {
                          message.error(formatRPCError(e));
                        }
                      }}
                    >
                      Cancel
                    </BrandButton>
                  </Space>
                )}
              </>
            );
          }}
        </Await>
      )}
    </ConnectOr>
  );
};
