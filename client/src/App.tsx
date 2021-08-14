import { Layout, Typography } from 'antd';
import 'antd/dist/antd.css';
import React, { FC } from 'react';
import { CreateGame } from './components/CreateGame';
import { GameList } from './components/GameList';

export const App: FC = () => {
  return (
    <Layout style={{ height: '100%' }}>
      <Layout.Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div>
          <Typography.Title>Tic Tac Toe. Decentralized</Typography.Title>
          <CreateGame />
          <GameList />
        </div>
      </Layout.Content>
    </Layout>
  );
};
