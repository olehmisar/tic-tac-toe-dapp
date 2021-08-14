import { Result } from 'antd';
import React, { FC, ReactNode } from 'react';
import { BrandLink } from '../components/BrandLink';

type Props = {
  title?: ReactNode;
};
export const NotFound: FC<Props> = ({ title = 'Not Found' }) => {
  return <Result status="404" title={title} subTitle="404" extra={<BrandLink to="/">Back to homepage</BrandLink>} />;
};
