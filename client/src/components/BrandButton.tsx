import { Button, ButtonProps, Spin } from 'antd';
import React, { FC, useState } from 'react';

type Props = Omit<ButtonProps, 'onClick'> & {
  onClick?: () => Promise<void> | void;
};

export const BrandButton: FC<Props> = ({ onClick, children, ...props }) => {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      {...props}
      disabled={loading}
      onClick={async () => {
        if (!onClick) {
          return;
        }
        setLoading(true);
        try {
          await onClick();
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? <Spin delay={-1}>{children}</Spin> : children}
    </Button>
  );
};
