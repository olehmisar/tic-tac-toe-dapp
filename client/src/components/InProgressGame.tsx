import { Alert, Card, Space, Spin } from 'antd';
import React, { FC, ReactNode } from 'react';
import { useQuery } from 'react-query';
import { useHistory } from 'react-router-dom';
import { useWeb3Provider } from '../store/web3';
import { BrandButton } from './BrandButton';
import { DisplayAddress } from './DisplayAddress';

type Props = {
  noGame?: ReactNode;
};
export const InProgressGame: FC<Props> = ({ noGame }) => {
  const web3 = useWeb3Provider((s) => s.state);
  const history = useHistory();
  const query = useQuery(`my-game-${!!web3}`, async () => {
    if (!web3) {
      return;
    }
    const gameId = await web3.ticTacToe.getGameId(await web3.provider.getSigner().getAddress());
    if (gameId.eq(0)) {
      return;
    }
    const game = await web3.ticTacToe.getGame(gameId);
    return { gameId: gameId.toString(), ...game };
  });

  if (query.isLoading) {
    return <Spin>Loading your game...</Spin>;
  }
  if (query.isError) {
    <Alert type="error" message="Failed to load" />;
  }
  const game = query.data;
  if (!game) {
    return <>{noGame}</>;
  }
  return (
    <Card title={'You are in the game!'}>
      <Card.Meta
        description={
          <Space size="large" direction="vertical">
            <span>
              <DisplayAddress address={game.player0} /> vs <DisplayAddress address={game.player1} />
            </span>
            <BrandButton
              onClick={() => {
                history.push(`/play/${game.gameId}`);
              }}
            >
              Continue playing
            </BrandButton>
          </Space>
        }
      />
    </Card>
  );
};
