import React, { FC } from 'react';
import { Board } from '../components/Board';
import { useGames } from '../store/games';
import { NotFound } from './NotFound';

type Props = {
  gamePoolId: string;
};
export const Game: FC<Props> = ({ gamePoolId }) => {
  console.log('games', useGames().games);
  const game = useGames().games[gamePoolId];
  if (!game) {
    return <NotFound title="Game not found" />;
  }
  return <Board game={game} />;
};
