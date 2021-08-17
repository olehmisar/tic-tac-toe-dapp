import { Layout, message, PageHeader, Space } from 'antd';
import 'antd/dist/antd.css';
import React, { FC, useEffect } from 'react';
import { Link, Route, Switch, useHistory } from 'react-router-dom';
import { GamePoolGameMatched, GamePoolJoinGamePayload } from '../../server/types';
import { Await } from './components/Await';
import { BrandButton } from './components/BrandButton';
import { ConnectOr } from './components/ConnectOr';
import { DisplayAddress } from './components/DisplayAddress';
import { JoinGameRequestNotification, Notifications, useNotifications } from './components/Notifications';
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
  useEffect(() => {
    const listener = async ({ gameId }: GamePoolGameMatched) => {
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
    socket.on('gamePool.gameMatched', listener);
    return () => {
      socket.off('gamePool.gameMatched', listener);
    };
  }, [web3, socket, history, gameState]);
  const notifications = useNotifications();
  useEffect(() => {
    const listener = async (payload: GamePoolJoinGamePayload) => {
      notifications.add(typedPlainToClass(JoinGameRequestNotification, { payload }));
    };
    socket.on('gamePool.joinGame', listener);
    return () => {
      socket.off('gamePool.joinGame', listener);
    };
  }, [socket, notifications]);
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
    <Layout style={{ height: '100%' }}>
      <PageHeader
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
