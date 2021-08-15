import { Card, Space } from 'antd';
import React, { FC } from 'react';
import { PendingGame } from '../../../server/types';
import { DisplayAddress } from './DisplayAddress';
import { JoinGameButton } from './JoinGameButton';

type Props = {
  game: PendingGame;
};
export const PendingGameCard: FC<Props> = ({ game }) => {
  return (
    <Card title={game.gameId}>
      <Card.Meta
        description={
          <Space size="large">
            <span>
              Created by <DisplayAddress address={game.creator} />
            </span>
            <JoinGameButton game={game} />
          </Space>
        }
      />
    </Card>
  );
};
