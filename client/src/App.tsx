import { Layout, Typography } from 'antd';
import 'antd/dist/antd.css';
import React, { FC, useEffect } from 'react';
import { CreateGame } from './components/CreateGame';
import { GameList } from './components/GameList';
import { useSocket } from './store/socket';

export const App: FC = () => {
  const socket = useSocket();
  useEffect(() => {
    socket.initialize();
  });
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
