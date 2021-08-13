import { ethers } from 'ethers';
import React, { FC, ReactNode } from 'react';
import { useWeb3Provider } from '../hooks/useWeb3Provider';
import { BrandButton } from './BrandButton';

type Props = {
  children: ((provider: ethers.providers.Web3Provider) => ReactNode) | ReactNode;
};

export const ConnectOr: FC<Props> = ({ children }) => {
  const { provider, connect } = useWeb3Provider();
  if (provider) {
    if (typeof children !== 'function') {
      return children;
    }
    return children(provider);
  }
  return (
    <BrandButton type="primary" onClick={connect}>
      Connect Wallet
    </BrandButton>
  );
};
