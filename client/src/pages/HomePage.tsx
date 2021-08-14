import { Typography } from 'antd';
import React, { FC } from 'react';
import { CreateGame } from '../components/CreateGame';
import { GameList } from '../components/GameList';

export const HomePage: FC = () => {
  return (
    <div>
      <Typography.Title>Tic Tac Toe. Decentralized</Typography.Title>
      <CreateGame />
      <GameList />
    </div>
  );
};
