import { Button } from 'antd';
import React, { FC } from 'react';
import { Link } from 'react-router-dom';

type Props = {
  to: string;
};

export const BrandLink: FC<Props> = ({ to, children }) => {
  return (
    <Link to={to}>
      <Button type="link">{children}</Button>
    </Link>
  );
};
