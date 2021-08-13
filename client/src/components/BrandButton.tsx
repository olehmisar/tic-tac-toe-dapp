import { Button, ButtonProps } from 'antd';
import React, { FC, useState } from 'react';

type Props = Omit<ButtonProps, 'onClick'> & {
  onClick?: () => Promise<void> | void;
};

export const BrandButton: FC<Props> = ({ onClick, ...props }) => {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      {...props}
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
    />
  );
};
