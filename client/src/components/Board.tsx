import cloneDeep from 'lodash/cloneDeep';
import React, { FC, useState } from 'react';
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

export const Board: FC = () => {
  const [board, setBoard] = useState([
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]);
  return (
    <div>
      {board.map((row, i) => (
        <div key={i} style={{ display: 'flex' }}>
          {row.map((cell, j) => (
            <Cell
              key={j}
              onClick={async () => {
                // TODO: should interact with socket io
                console.log(`click on ${i} ${j}`);
                const newBoard = cloneDeep(board);
                newBoard[i][j] = 1;
                setBoard(newBoard);
              }}
            >
              {cell}
            </Cell>
          ))}
        </div>
      ))}
    </div>
  );
};
