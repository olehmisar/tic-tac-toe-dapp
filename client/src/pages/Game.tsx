import React, { FC } from 'react';
import { Board } from '../components/Board';
import { useGames } from '../store/games';
import { NotFound } from './NotFound';

type Props = {
  gameId: string;
};
export const Game: FC<Props> = ({ gameId }) => {
  const game = useGames().games[gameId];
  if (!game) {
    return <NotFound title="Game not found" />;
  }
  return <Board game={game} />;
};
