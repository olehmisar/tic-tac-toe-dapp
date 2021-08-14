import { arrayify, keccak256 } from 'ethers/lib/utils';
import React, { FC } from 'react';
import { useSocket } from '../store/socket';
import { BrandButton } from './BrandButton';
import { ConnectOr } from './ConnectOr';

export const CreateGame: FC = () => {
  const socket = useSocket();
  return (
    <ConnectOr>
      {({ provider }) => (
        <BrandButton
          type="primary"
          onClick={async () => {
            const signer = provider.getSigner();
            const address = await signer.getAddress();
            const signature = await signer.signMessage(arrayify(keccak256(address)));
            socket.createGame(address, signature);
          }}
        >
          Create game
        </BrandButton>
      )}
    </ConnectOr>
  );
};
