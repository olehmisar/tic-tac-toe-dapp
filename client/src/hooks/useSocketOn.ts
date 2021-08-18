import { useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { ClientWsInterface, ServerWsInterface } from '../../../server/types';

export const useSocketOn = <E extends keyof ClientWsInterface>(
  socket: Socket<Pick<ClientWsInterface, E>, ServerWsInterface>,
  ev: E,
  listener: ClientWsInterface[E],
) => {
  useEffect(() => {
    // @ts-expect-error TODO: properly type this
    socket.on(ev, listener);
    return () => {
      socket.off(ev, listener);
    };
  }, [socket, ev, listener]);
};
