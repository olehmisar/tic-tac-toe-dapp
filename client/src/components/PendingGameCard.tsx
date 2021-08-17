import { Card, Space } from 'antd';
import React, { FC } from 'react';
import { PendingGame } from '../../../server/types';
import { useSocket } from '../store/socket';
import { Await } from './Await';
import { BrandButton } from './BrandButton';
import { ConnectOr } from './ConnectOr';
import { DisplayAddress } from './DisplayAddress';
import { JoinGameButton } from './JoinGameButton';

type Props = {
  game: PendingGame;
};
export const PendingGameCard: FC<Props> = ({ game }) => {
  const { socket } = useSocket();
  return (
    <Card title={game.gameId}>
      <Card.Meta
        description={
          <Space size="large">
            <span>
              Created by <DisplayAddress address={game.creator} />
            </span>
            <ConnectOr>
              {({ provider }) => {
                return (
                  <Await promise={provider.getSigner().getAddress()}>
                    {(address) =>
                      address === game.creator ? (
                        <BrandButton
                          onClick={async () => {
                            const chainId = await provider.getSigner().getChainId();
                            socket.emit('gamePool.removeGame', { chainId, gameId: game.gameId });
                          }}
                        >
                          Remove
                        </BrandButton>
                      ) : (
                        <JoinGameButton game={game} />
                      )
                    }
                  </Await>
                );
              }}
            </ConnectOr>
          </Space>
        }
      />
    </Card>
  );
};
