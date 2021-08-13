import { ethers } from 'ethers';
import React, { FC, ReactNode } from 'react';
import { Contracts, useWeb3Provider } from '../hooks/useWeb3Provider';
import { BrandButton } from './BrandButton';

type Props = {
  children: ((state: { provider: ethers.providers.Web3Provider; contracts: Contracts }) => ReactNode) | ReactNode;
};

export const ConnectOr: FC<Props> = ({ children }) => {
  const { state, connect } = useWeb3Provider();
  if (state) {
    if (typeof children !== 'function') {
      return children;
    }
    return children(state);
  }
  return (
    <BrandButton type="primary" onClick={connect}>
      Connect Wallet
    </BrandButton>
  );
};
