import { BellOutlined } from '@ant-design/icons';
import { List, Popover } from 'antd';
import React, { FC } from 'react';
import { useNotifications } from './store';

export const Notifications: FC = () => {
  const notifications = useNotifications();
  return (
    <Popover
      trigger="click"
      content={
        <List
          dataSource={notifications.box}
          renderItem={(msg) => (
            <List.Item>
              <msg.Component {...msg} />
            </List.Item>
          )}
        />
      }
    >
      <BellOutlined />
    </Popover>
  );
};

export * from './classes';
export { useNotifications };
