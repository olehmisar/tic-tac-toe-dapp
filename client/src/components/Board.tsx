import React, { FC } from 'react';
import { GameState } from '../store/gameState';
import { BrandButton } from './BrandButton';

type CellProps = {
  onClick: () => Promise<void>;
};
const Cell: FC<CellProps> = ({ onClick, children }) => {
  return (
    <BrandButton onClick={onClick} style={{ width: 70, height: 70 }}>
      {children}
    </BrandButton>
  );
};

type Props = {
  game: GameState;
  onMove: (i: number, j: number) => Promise<void>;
};
export const Board: FC<Props> = ({ game, onMove }) => {
  return (
    <div>
      {game.state.board.map((row, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'center' }}>
          {row.map((cell, j) => (
            <Cell key={j} onClick={async () => await onMove(i, j)}>
              {addressToSymbol(cell, game.me, game.opponent)}
            </Cell>
          ))}
        </div>
      ))}
    </div>
  );
};

function addressToSymbol(address: string, addressA: string, addressB: string) {
  const [address0, address1] = addressA < addressB ? [addressA, addressB] : [addressB, addressA];
  if (address == address0) {
    return 'X';
  } else if (address == address1) {
    return 'O';
  }
  return ' ';
}
