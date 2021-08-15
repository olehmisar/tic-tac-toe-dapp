import { Divider, Space } from 'antd';
import React, { FC } from 'react';
import { CreateGame } from '../components/CreateGame';
import { GameList } from '../components/GameList';

export const HomePage: FC = () => {
  return (
    <Space size="large" direction="vertical">
      <CreateGame />
      <Divider>OR</Divider>
      <GameList />
    </Space>
  );
};
