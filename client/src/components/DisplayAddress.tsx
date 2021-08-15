import { Popover } from 'antd';
import React, { FC } from 'react';
import { formatAddress } from '../utils';

type Props = {
  address: string;
};
export const DisplayAddress: FC<Props> = ({ address }) => {
  return <Popover content={address}>{formatAddress(address)}</Popover>;
};
