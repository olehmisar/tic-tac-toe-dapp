import { message } from 'antd';
import { arrayify, keccak256 } from 'ethers/lib/utils';
import React, { FC } from 'react';
import { useSocket } from '../store/socket';
import { formatRPCError } from '../utils';
import { BrandButton } from './BrandButton';
import { ConnectOr } from './ConnectOr';

export const CreateGame: FC = () => {
  const socket = useSocket();
  return (
    <ConnectOr>
      {({ provider, ticTacToe }) => (
        <BrandButton
          type="primary"
          onClick={async () => {
            try {
              const signer = provider.getSigner();
              const address = await signer.getAddress();
              const signature = await signer.signMessage(arrayify(keccak256(address)));
              const gameId = (await ticTacToe.calcGameId(address)).toString();
              socket.createGame({ gameId, creator: address, signature });
            } catch (e) {
              message.error(formatRPCError(e));
            }
          }}
        >
          Create game
        </BrandButton>
      )}
    </ConnectOr>
  );
};
