import detectProvider from '@metamask/detect-provider';
import { message } from 'antd';
import { ethers } from 'ethers';
import { useState } from 'react';
import { TicTacToe, TicTacToe__factory } from '../../../typechain';
import config from '../config';

export type Contracts = {
  ticTacToe: TicTacToe;
};

// TODO: refactor into a store
export function useWeb3Provider() {
  const [state, setState] = useState<{ provider: ethers.providers.Web3Provider; contracts: Contracts } | undefined>();
  return {
    state,
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
        await message.error('Failed to connect to a wallet');
        return;
      }

      const signer = provider.getSigner();
      const chainId = (await signer.getChainId()) as keyof typeof config.addresses;
      if (!config.addresses[chainId]) {
        await message.error('Unsupported network');
        return;
      }
      const addresses = config.addresses[chainId];
      setState({
        provider,
        contracts: {
          ticTacToe: new TicTacToe__factory(signer).attach(addresses.TicTacToe),
        },
      });
      await message.success('Successfully connected');
    },
  };
}
