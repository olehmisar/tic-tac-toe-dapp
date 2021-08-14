import React, { FC } from 'react';
import { CreateGame } from '../components/CreateGame';
import { GameList } from '../components/GameList';

export const HomePage: FC = () => {
  return (
    <div>
      <CreateGame />
      <GameList />
    </div>
  );
};
