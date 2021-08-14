import { Card, List, message } from 'antd';
import { ethers } from 'ethers';
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
                      ethers.utils.arrayify(await ticTacToe.encodeGameStart(game.creator, address)),
                    );
                    await ticTacToe.startGame(game.creator, address, game.signature, signature);
                    socket.joinGame({ gameId: game.gameId, joined: address, signature });
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
