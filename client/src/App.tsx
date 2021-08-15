import { Layout, PageHeader, Space } from 'antd';
import 'antd/dist/antd.css';
import React, { FC } from 'react';
import { Link, Route, Switch } from 'react-router-dom';
import { Await } from './components/Await';
import { BrandButton } from './components/BrandButton';
import { ConnectOr } from './components/ConnectOr';
import { DisplayAddress } from './components/DisplayAddress';
import { Game } from './pages/Game';
import { HomePage } from './pages/HomePage';
import { NotFound } from './pages/NotFound';
import { useSocket } from './store/socket';

export const App: FC = () => {
  // initialize socket
  useSocket();
  return (
    <Layout style={{ height: '100%' }}>
      <PageHeader
        title={
          <Link to="/" style={{ color: 'inherit' }}>
            Tic Tac Toe. Decentralized
          </Link>
        }
        extra={
          <ConnectOr>
            {({ provider }) => (
              <Space>
                <Await promise={provider.getSigner().getAddress()}>
                  {(address) => <DisplayAddress address={address} />}
                </Await>
                <BrandButton disabled>Connected</BrandButton>
              </Space>
            )}
          </ConnectOr>
        }
      />
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
