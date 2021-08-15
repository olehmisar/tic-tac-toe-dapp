import { arrayify } from '@ethersproject/bytes';
import { Card, List, message } from 'antd';
import React, { FC } from 'react';
import { useSocket } from '../store/socket';
import { formatRPCError } from '../utils';
import { BrandButton } from './BrandButton';
import { ConnectOr } from './ConnectOr';

export const GameList: FC = () => {
  const socket = useSocket();
  return (
    <List
      dataSource={Object.values(socket.gamePool)}
      renderItem={(game) => (
        <List.Item key={game.gameId}>
          <Card>{game.creator}</Card>
          <ConnectOr>
            {({ provider, ticTacToe }) => (
              <BrandButton
                onClick={async () => {
                  const signer = provider.getSigner();
                  const address = await signer.getAddress();
                  try {
                    const signature = await signer.signMessage(
                      arrayify(await ticTacToe.encodeGameStart(game.creator, address)),
                    );
                    const movesSignature = await signer.signMessage(
                      arrayify(await ticTacToe.encodeMoves(game.gameId, [])),
                    );
                    const tx = await ticTacToe.startGame(game.creator, address, signature, signature);
                    await tx.wait();
                    socket.joinGame({ gameId: game.gameId, joined: address, joinedMovesSignature: movesSignature });
                  } catch (e) {
                    message.error(formatRPCError(e));
                    return;
                  }
                }}
              >
                Join
              </BrandButton>
            )}
          </ConnectOr>
        </List.Item>
      )}
    ></List>
  );
};
