import { Alert, Card, Space, Spin, Typography } from 'antd';
import React, { FC } from 'react';
import { useQuery } from 'react-query';
import { useHistory } from 'react-router-dom';
import { useWeb3Provider } from '../store/web3';
import { BrandButton } from './BrandButton';
import { BrandLink } from './BrandLink';
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
  const limit = 3;
  return (
    <Space direction="vertical">
      <Typography.Title level={3}>My games</Typography.Title>
      <Space wrap>
        {games.slice(0, limit).map((game) => (
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
        ))}
      </Space>
      {games.length > limit && (
        // TODO: make this page
        <BrandLink type="default" to="/unfinished-games">
          See all
        </BrandLink>
      )}
    </Space>
  );
};
