import { Layout, message, PageHeader, Space } from 'antd';
import 'antd/dist/antd.css';
import React, { FC, useEffect } from 'react';
import { Link, Route, Switch, useHistory } from 'react-router-dom';
import { GameMatchedPayload } from '../../server/types';
import { Await } from './components/Await';
import { BrandButton } from './components/BrandButton';
import { ConnectOr } from './components/ConnectOr';
import { DisplayAddress } from './components/DisplayAddress';
import { Game } from './pages/Game';
import { HomePage } from './pages/HomePage';
import { NotFound } from './pages/NotFound';
import { useGameState } from './store/gameState';
import { useSocket } from './store/socket';
import { useWeb3Provider } from './store/web3';

export const App: FC = () => {
  // initialize socket
  const { socket } = useSocket();
  const { web3 } = useWeb3Provider();
  const gameState = useGameState();
  const history = useHistory();
  useEffect(() => {
    const listener = async ({ gameId }: GameMatchedPayload) => {
      if (!web3?.ticTacToe) {
        message.error('Game matched but not connected to blockchain');
        return;
      }
      try {
        await gameState.initialize(web3.ticTacToe, gameId);
      } catch (e) {
        message.error('Failed to initialize game state');
      }
      history.push(`/play/${gameId}`);
      message.success('Game started');
    };
    socket.on('gameMatched', listener);
    return () => {
      socket.off('gameMatched', listener);
    };
  }, [web3, socket, history]);
  return (
    <Layout style={{ height: '100%' }}>
      <PageHeader
        title={
          <Link to="/" style={{ color: 'inherit' }}>
            Tic Tac Toe. Decentralized
          </Link>
        }
        subTitle={web3?.ticTacToe.address && <DisplayAddress address={web3.ticTacToe.address} />}
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
          <Route
            exact
            path="/play/:gameId"
            render={({ match }) => <ConnectOr>{(web3) => <Game web3={web3} {...match.params} />}</ConnectOr>}
          />
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </Layout.Content>
    </Layout>
  );
};
