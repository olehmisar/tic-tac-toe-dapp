import React, { FC, ReactNode } from 'react';
import { useWeb3Provider, Web3State } from '../store/web3';
import { BrandButton } from './BrandButton';

type Props = {
  children: ((state: Web3State) => ReactNode) | ReactNode;
};

export const ConnectOr: FC<Props> = ({ children }) => {
  const { web3, connect } = useWeb3Provider();
  if (web3) {
    if (typeof children !== 'function') {
      return children;
    }
    return children(web3);
  }
  return (
    <BrandButton type="primary" onClick={connect}>
      Connect Wallet
    </BrandButton>
  );
};
