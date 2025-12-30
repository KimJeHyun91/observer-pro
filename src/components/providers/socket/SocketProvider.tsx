import { ReactNode, useEffect, createContext, useState, useRef } from 'react';
import SocketService from '@/services/socket';

export interface SocketContextType {
	isConnected: boolean;
}

export const SocketContext = createContext<SocketContextType>({ isConnected: false });

interface SocketProviderProps {
	children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps): JSX.Element {
	const [isConnected, setIsConnected] = useState(false);
	const socketService = SocketService.getInstance();
	const mountedRef = useRef(false);

	useEffect(() => {
		if (mountedRef.current) return;
		mountedRef.current = true;

		const checkConnection = () => {
			const connected = socketService.isConnected();
			setIsConnected(connected);
		};

		socketService.initialize();

		const connectHandler = () => {
			checkConnection();
		};

		const disconnectHandler = () => {
			if (mountedRef.current) {
				setIsConnected(false);
			}
		};

		socketService.onConnect(connectHandler);
		socketService.onDisconnect(disconnectHandler);

		// 초기 상태 확인
		checkConnection();

		return () => {
			if (mountedRef.current) {
				mountedRef.current = false;
				socketService.disconnect();
			}
		};
	}, []);

	return (
		<SocketContext.Provider value={{ isConnected }}>
			{children}
		</SocketContext.Provider>
	);
}