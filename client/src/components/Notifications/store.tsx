import { notification } from 'antd';
import { Exclude, Type } from 'class-transformer';
import React from 'react';
import create from 'zustand';
import { combine } from 'zustand/middleware';
import { ElementType, persistWithClassTransform } from '../../utils';
import { JoinGameRequestNotification, Notification } from './classes';

export const useNotifications = () => {
  const { wrapper, add } = useNotificationsStore();
  return {
    box: wrapper.box,
    add,
  };
};

class NotificationBox {
  @Exclude() private static classes = [JoinGameRequestNotification];

  @Type(() => Notification, {
    discriminator: {
      property: '__type',
      subTypes: NotificationBox.classes.map((cls) => ({ name: cls.name, value: cls })),
    },
  })
  box: InstanceType<ElementType<typeof NotificationBox.classes>>[] = [];
}

// TODO: Refactor this store. Get rid of `combine`
const useNotificationsStore = create(
  persistWithClassTransform(
    combine(
      {
        wrapper: new NotificationBox(),
      },
      (set, get) => ({
        add(msg: ElementType<NotificationBox['box']>) {
          const wrapper = get().wrapper;
          wrapper.box.unshift(msg);
          notification.info({
            message: <msg.Component {...msg} />,
            duration: 0,
          });
          set({ wrapper });
        },
      }),
    ),
    { name: 'notifications', cls: NotificationBox, key: 'wrapper' },
  ),
);
