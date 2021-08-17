import { message } from 'antd';
import React, { FC } from 'react';
import { useSocket } from '../store/socket';
import { formatRPCError } from '../utils';
import { BrandButton } from './BrandButton';
import { ConnectOr } from './ConnectOr';

export const CreateGame: FC = () => {
  const { socket } = useSocket();
  return (
    <ConnectOr>
      {({ provider, ticTacToe }) => (
        <BrandButton
          type="primary"
          size="large"
          onClick={async () => {
            try {
              const signer = provider.getSigner();
              const address = await signer.getAddress();
              const gameId = await ticTacToe.calcGameId(address);
              socket.emit(
                'gamePool.createGame',
                {
                  chainId: await signer.getChainId(),
                  gameId: gameId.toString(),
                  creator: address,
                },
                () => {
                  message.success('Successfully created a game');
                },
              );
            } catch (e) {
              message.error(formatRPCError(e));
            }
          }}
        >
          Create Game
        </BrandButton>
      )}
    </ConnectOr>
  );
};
