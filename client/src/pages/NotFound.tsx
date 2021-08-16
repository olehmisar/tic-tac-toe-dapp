import { Result, ResultProps, Space } from 'antd';
import React, { FC } from 'react';
import { BrandLink } from '../components/BrandLink';

export const NotFound: FC<ResultProps> = (props) => {
  return (
    <Result
      {...props}
      status="404"
      title={props.title ?? 'Not Found'}
      subTitle={props.subTitle ?? '404'}
      extra={
        <Space direction="vertical">
          {props.extra}
          <BrandLink to="/">Back to homepage</BrandLink>
        </Space>
      }
    />
  );
};
