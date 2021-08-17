import { arrayify } from '@ethersproject/bytes';
import { Card, message } from 'antd';
import { Exclude, Expose } from 'class-transformer';
import React, { FC } from 'react';
import { useHistory } from 'react-router-dom';
import { GamePoolJoinGamePayload } from '../../../../server/types';
import { useGameState } from '../../store/gameState';
import { useSocket } from '../../store/socket';
import { formatRPCError } from '../../utils';
import { BrandButton } from '../BrandButton';
import { ConnectOr } from '../ConnectOr';
import { DisplayAddress } from '../DisplayAddress';

export abstract class Notification {
  @Exclude() abstract Component: FC<this>;
}

export class JoinGameRequestNotification extends Notification {
  @Expose() payload!: GamePoolJoinGamePayload;

  Component: FC<this> = ({ payload }) => {
    /* eslint-disable react-hooks/rules-of-hooks */
    const { socket } = useSocket();
    const history = useHistory();
    const gameState = useGameState();
    /* eslint-enable */
    return (
      <Card
        title={
          <>
            <DisplayAddress address={payload.joined} /> wants to join your game
          </>
        }
        actions={[
          <ConnectOr>
            {({ provider, ticTacToe }) => (
              <BrandButton
                onClick={async () => {
                  const signer = provider.getSigner();
                  const address = await signer.getAddress();
                  try {
                    const mySignature = await signer.signMessage(
                      arrayify(await ticTacToe.encodeGameStart(payload.gameId, address, payload.joined)),
                    );
                    const tx = await ticTacToe.startGame(address, payload.joined, mySignature, payload.signature);
                    await tx.wait();
                    // TODO: extract logic starting the game into a function/component/module
                    socket.emit('gamePool.gameMatched', { gameId: payload.gameId });
                    message.success('Accepted');
                    try {
                      await gameState.initialize(ticTacToe, payload.gameId);
                    } catch (e) {
                      message.error('Failed to initialize game state');
                    }
                    // TODO: this doesn't work because antd notifications are outside context providers
                    history.push(`/play/${payload.gameId}`);
                  } catch (e) {
                    message.error(formatRPCError(e));
                    return;
                  }
                }}
              >
                Accept
              </BrandButton>
            )}
          </ConnectOr>,
        ]}
      />
    );
  };
}
