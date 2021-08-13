import { Layout, Space, Typography } from 'antd';
import 'antd/dist/antd.css';
import React, { FC } from 'react';
import { BrandButton } from './components/BrandButton';
import { ConnectOr } from './components/ConnectOr';

export const App: FC = () => {
  return (
    <Layout style={{ height: '100%' }}>
      <Layout.Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div>
          <Typography.Title>Tic Tac Toe. Decentralized</Typography.Title>
          <ConnectOr>
            {(provider) => (
              <Space>
                <BrandButton type="primary">Create game</BrandButton>
                <BrandButton>Join game</BrandButton>
              </Space>
            )}
          </ConnectOr>
        </div>
      </Layout.Content>
    </Layout>
  );
};
