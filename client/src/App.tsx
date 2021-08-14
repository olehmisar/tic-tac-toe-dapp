import { Layout, message, Space, Typography } from 'antd';
import 'antd/dist/antd.css';
import React, { FC } from 'react';
import { BrandButton } from './components/BrandButton';
import { ConnectOr } from './components/ConnectOr';
import { formatRPCError } from './utils';

export const App: FC = () => {
  return (
    <Layout style={{ height: '100%' }}>
      <Layout.Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div>
          <Typography.Title>Tic Tac Toe. Decentralized</Typography.Title>
          <ConnectOr>
            {({ provider, contracts: { ticTacToe } }) => (
              <Space>
                <BrandButton
                  type="primary"
                  onClick={async () => {
                    const address = await provider.getSigner().getAddress();
                    try {
                      await ticTacToe.startGame(address, address, '', '');
                    } catch (e) {
                      await message.error(formatRPCError(e));
                    }
                  }}
                >
                  Create game
                </BrandButton>
                <BrandButton>Join game</BrandButton>
              </Space>
            )}
          </ConnectOr>
        </div>
      </Layout.Content>
    </Layout>
  );
};
