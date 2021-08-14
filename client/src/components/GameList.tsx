import { Card, List, message } from 'antd';
import { ethers } from 'ethers';
import React, { FC, useEffect } from 'react';
import { useSocket } from '../store/socket';
import { formatRPCError } from '../utils';
import { BrandButton } from './BrandButton';
import { ConnectOr } from './ConnectOr';

export const GameList: FC = () => {
  const socket = useSocket();
  useEffect(() => {
    socket.listenToGamePool();
  });
  return (
    <List
      dataSource={Object.entries(socket.gamePool)}
      renderItem={([poolId, game]) => (
        <List.Item key={poolId}>
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
                    socket.joinGame(Number(poolId), address, signature);
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
