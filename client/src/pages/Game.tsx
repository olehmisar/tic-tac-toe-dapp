import React, { FC } from 'react';
import { Board } from '../components/Board';
import { ConnectOr } from '../components/ConnectOr';
import { useGame } from '../store/games';
import { useSocket } from '../store/socket';
import { NotFound } from './NotFound';

type Props = {
  gameId: string;
};
export const Game: FC<Props> = ({ gameId }) => {
  const state = useGame(gameId);
  const socket = useSocket();
  if (!state) {
    return <NotFound title="Game not found" />;
  }
  return (
    <ConnectOr>
      {({ provider, ticTacToe }) => (
        <Board
          game={state.game}
          onMove={async (i, j) => {
            const signer = provider.getSigner();
            await state.makeMove(signer, ticTacToe, { player: state.game.me, i, j });
          }}
        />
      )}
    </ConnectOr>
  );
};
