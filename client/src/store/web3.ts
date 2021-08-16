import detectProvider from '@metamask/detect-provider';
import { message } from 'antd';
import { ethers } from 'ethers';
import create from 'zustand';
import { combine } from 'zustand/middleware';
import { TicTacToe, TicTacToe__factory } from '../../../typechain';
import config from '../config';

export type Web3State = {
  provider: ethers.providers.Web3Provider;
  ticTacToe: TicTacToe;
};

export const useWeb3Provider = create(
  combine(
    {
      web3: undefined as Web3State | undefined,
    },
    (set) => ({
      async connect() {
        const p = (await detectProvider()) as any;
        if (!p) {
          message.error('Wallet not detected');
          return;
        }
        const provider = new ethers.providers.Web3Provider(p);
        try {
          await provider.provider.request!({ method: 'eth_requestAccounts' });
        } catch (e) {
          message.error('Failed to connect to a wallet');
          return;
        }

        // TODO: don't require page reload when changing networks
        p.on('chainChanged', () => window.location.reload());

        const signer = provider.getSigner();
        const chainId = (await signer.getChainId()) as keyof typeof config.addresses;
        if (!config.addresses[chainId]) {
          message.error('Unsupported network');
          return;
        }
        const addresses = config.addresses[chainId];
        set({
          web3: {
            provider,
            ticTacToe: new TicTacToe__factory(signer).attach(addresses.TicTacToe),
          },
        });
        message.success('Successfully connected');
      },
    }),
  ),
);
