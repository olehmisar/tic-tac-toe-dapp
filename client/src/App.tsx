import { Layout, message, PageHeader, Space } from 'antd';
import 'antd/dist/antd.css';
import React, { FC, useEffect } from 'react';
import { Link, Route, Switch, useHistory } from 'react-router-dom';
import { Await } from './components/Await';
import { BrandButton } from './components/BrandButton';
import { ConnectOr } from './components/ConnectOr';
import { Container } from './components/Container';
import { DisplayAddress } from './components/DisplayAddress';
import { JoinGameRequestNotification, Notifications, useNotifications } from './components/Notifications';
import { useSocketOn } from './hooks/useSocketOn';
import { Game } from './pages/Game';
import { HomePage } from './pages/HomePage';
import { NotFound } from './pages/NotFound';
import { useGameState } from './store/gameState';
import { useSocket } from './store/socket';
import { useWeb3Provider } from './store/web3';
import { typedPlainToClass } from './utils';

export const App: FC = () => {
  // initialize socket
  const { socket } = useSocket();
  const { web3 } = useWeb3Provider();
  const gameState = useGameState();
  const history = useHistory();
  useSocketOn(socket, 'gamePool.gameMatched', async ({ gameId }) => {
    if (!web3?.ticTacToe) {
      message.error('Game matched but not connected to blockchain');
      return;
    }
    try {
      await gameState.initialize(web3.ticTacToe, gameId);
    } catch (e) {
      message.error('Failed to initialize game state');
    }
    // TODO: show notification instead of forcefully navigating to game page
    history.push(`/play/${gameId}`);
    message.success('Game started');
  });
  const notifications = useNotifications();
  useSocketOn(socket, 'gamePool.joinGame', async (payload) => {
    notifications.add(typedPlainToClass(JoinGameRequestNotification, { payload }));
  });
  useEffect(() => {
    if (!web3) {
      return;
    }
    (async () => {
      const chainId = await web3.provider.getSigner().getChainId();
      socket.emit('gamePool.requestGameList', { chainId });
    })();
  }, [socket, web3]);
  return (
    <Layout style={{ minHeight: '100%' }}>
      <PageHeader
        style={{ position: 'sticky' }}
        title={
          <Link to="/" style={{ color: 'inherit' }}>
            Tic Tac Toe. Decentralized
          </Link>
        }
        subTitle={web3?.ticTacToe.address && <DisplayAddress address={web3.ticTacToe.address} />}
        extra={
          <Space size="large">
            <Notifications />
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
          </Space>
        }
      />
      <Container style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
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
      </Container>
    </Layout>
  );
};
