import React, { FC, useEffect } from 'react';
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
  useEffect(() => {
    socket.updateGame({ ...state.game.state, gameId: state.game.gameId });
  }, [state.game.state.moves.length]);
  return (
    <ConnectOr>
      {({ ticTacToe }) => (
        <Board
          game={state.game}
          onMove={async (i, j) => {
            await state.makeMove(ticTacToe, { player: state.game.me, i, j });
          }}
        />
      )}
    </ConnectOr>
  );
};
