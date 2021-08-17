import { arrayify } from '@ethersproject/bytes';
import { message } from 'antd';
import React, { FC } from 'react';
import { PendingGame } from '../../../server/types';
import { useSocket } from '../store/socket';
import { formatRPCError } from '../utils';
import { BrandButton } from './BrandButton';
import { ConnectOr } from './ConnectOr';

type Props = {
  game: PendingGame;
};
export const JoinGameButton: FC<Props> = ({ game }) => {
  const { socket } = useSocket();
  return (
    <ConnectOr>
      {({ provider, ticTacToe }) => (
        <BrandButton
          type="primary"
          onClick={async () => {
            const signer = provider.getSigner();
            const address = await signer.getAddress();
            try {
              const signature = await signer.signMessage(
                arrayify(await ticTacToe.encodeGameStart(game.gameId, game.creator, address)),
              );
              const tx = await ticTacToe.startGame(game.creator, address, game.creatorGameStartSignature, signature);
              await tx.wait();
              socket.emit('gamePool.joinGame', {
                chainId: await signer.getChainId(),
                gameId: game.gameId,
              });
            } catch (e) {
              message.error(formatRPCError(e));
              return;
            }
          }}
        >
          Join Game
        </BrandButton>
      )}
    </ConnectOr>
  );
};
