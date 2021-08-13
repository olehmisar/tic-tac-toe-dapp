import detectProvider from '@metamask/detect-provider';
import { message } from 'antd';
import { ethers } from 'ethers';
import { useState } from 'react';

export function useWeb3Provider() {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | undefined>();
  return {
    provider,
    async connect() {
      const p = (await detectProvider()) as any;
      if (!p) {
        message.error('Failed to connect to a wallet');
        return;
      }
      const provider = new ethers.providers.Web3Provider(p);
      setProvider(provider);
    },
  };
}
