import { useContext } from 'react';
import { SocketContext, SocketContextType } from './SocketProvider';

export const useSocketStatus = (): SocketContextType => {
  return useContext(SocketContext);
};