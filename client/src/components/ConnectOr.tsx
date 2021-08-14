import React, { FC, ReactNode } from 'react';
import { useWeb3Provider, Web3State } from '../store/web3';
import { BrandButton } from './BrandButton';

type Props = {
  children: ((state: Web3State) => ReactNode) | ReactNode;
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
