import { Alert, Card, List, Space, Spin } from 'antd';
import React, { FC } from 'react';
import { useQuery } from 'react-query';
import { useHistory } from 'react-router-dom';
import { useWeb3Provider } from '../store/web3';
import { BrandButton } from './BrandButton';
import { DisplayAddress } from './DisplayAddress';

export const InProgressGames: FC = () => {
  const web3 = useWeb3Provider((s) => s.web3);
  const history = useHistory();
  const query = useQuery(`my-games-${!!web3}`, async () => {
    if (!web3) {
      return [];
    }
    const { ticTacToe, provider } = web3;
    const gameIds = await ticTacToe.unfinishedGameIds(await provider.getSigner().getAddress());
    const games = Promise.all(
      gameIds.map(async (gameId) => ({
        gameId: gameId.toString(),
        ...(await ticTacToe.getGame(gameId)),
      })),
    );
    return games;
  });

  if (query.isLoading) {
    return <Spin>Loading your game...</Spin>;
  }
  if (query.isError) {
    return <Alert closable type="error" message="Failed to load" />;
  }
  const games = query.data ?? [];
  return (
    <List
      dataSource={games}
      renderItem={(game) => (
        <List.Item key={game.gameId}>
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
        </List.Item>
      )}
    />
  );
};
