import { Button, ButtonProps } from 'antd';
import React, { FC } from 'react';
import { Link } from 'react-router-dom';

type Props = ButtonProps & {
  to: string;
};

export const BrandLink: FC<Props> = ({ to, ...props }) => {
  return (
    <Link to={to}>
      <Button {...props} type={props.type ?? 'link'} />
    </Link>
  );
};
