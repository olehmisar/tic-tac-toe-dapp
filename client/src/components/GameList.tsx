import { Empty, List } from 'antd';
import React, { FC } from 'react';
import { useSocket } from '../store/socket';
import { PendingGameCard } from './PendingGameCard';

export const GameList: FC = () => {
  const socket = useSocket();
  const gamePool = Object.values(socket.gamePool);
  if (gamePool.length === 0) {
    return <Empty description="No open games" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }
  return (
    <List
      dataSource={gamePool}
      renderItem={(game) => (
        <List.Item key={game.gameId}>
          <PendingGameCard game={game} />
        </List.Item>
      )}
    ></List>
  );
};
