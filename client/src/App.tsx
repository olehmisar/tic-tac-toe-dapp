import { Layout, Typography } from 'antd';
import 'antd/dist/antd.css';
import React, { FC, useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { Game } from './pages/Game';
import { HomePage } from './pages/HomePage';
import { useSocket } from './store/socket';

export const App: FC = () => {
  const socket = useSocket();
  useEffect(() => {
    socket.initialize();
  });
  return (
    <Layout style={{ height: '100%' }}>
      <Layout.Content
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}
      >
        <Typography.Title>Tic Tac Toe. Decentralized</Typography.Title>
        <Router>
          <Switch>
            <Route exact path="/">
              <HomePage />
            </Route>
            <Route exact path="/play" render={({ match }) => <Game />}></Route>
          </Switch>
        </Router>
      </Layout.Content>
    </Layout>
  );
};
