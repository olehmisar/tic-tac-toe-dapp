import { Layout } from 'antd';
import 'antd/dist/antd.css';
import React, { FC } from 'react';
import { Route, Switch } from 'react-router-dom';
import { Game } from './pages/Game';
import { HomePage } from './pages/HomePage';
import { NotFound } from './pages/NotFound';
import { useSocket } from './store/socket';

export const App: FC = () => {
  // initialize socket
  useSocket();
  return (
    <Layout style={{ height: '100%' }}>
      <Layout.Content
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          textAlign: 'center',
        }}
      >
        <Switch>
          <Route exact path="/">
            <HomePage />
          </Route>
          <Route exact path="/play/:gameId" render={({ match }) => <Game {...match.params} />} />
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </Layout.Content>
    </Layout>
  );
};
