import { Divider, Layout, Space } from 'antd';
import React, { FC } from 'react';
import { CreateGame } from '../components/CreateGame';
import { GameList } from '../components/GameList';
import { InProgressGames } from '../components/InProgressGames';

export const HomePage: FC = () => {
  return (
    <Layout>
      <Space direction="vertical">
        <InProgressGames />
        <Divider />
        <CreateGame />
        <Divider>OR</Divider>
        <GameList />
      </Space>
    </Layout>
  );
};
