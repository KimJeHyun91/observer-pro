const net = require('net');
const { addOperLog } = require('../../utils/addOperLog');
const iconv = require('iconv-lite');
const { pool } = require('../../db/postgresqlPool');

const CONNECTION_STATE = {
	DISCONNECTED: 'disconnected',
	CONNECTING: 'connecting',
	CONNECTED: 'connected',
	RECONNECTING: 'reconnecting',
	FAILED: 'failed'
};

const state = {
	billboardConnections: new Map(),
	addedBillboards: [],
	messageMap: new Map(),
	billboardsStatusCheck: [],
	healthCheckInterval: null,
	lastActivityMap: new Map(),
	connectionStates: new Map(),
	reconnectTimers: new Map(),
	failureCount: new Map()
};

const PROTOCOL_CONFIG = {
	DELIMITER_START: '#####',
	DELIMITER_END: '$$$$$',
	RS232_START: '\x02',
	RS232_END: '\x03',
	TIMEOUT_DURATION: 30 * 1000,
	RECONNECT_BASE_DELAY: 1000,
	RECONNECT_MAX_DELAY: 30 * 1000,
	HEALTH_CHECK_INTERVAL: 60 * 1000,
	PING_TIMEOUT: 3 * 1000,
	MAX_INACTIVE_TIME: 60 * 1000,
	KEEP_ALIVE_INTERVAL: 30 * 1000,
	MAX_FAILURES: 5,
	CIRCUIT_BREAKER_TIMEOUT: 5 * 60 * 1000
};

const MESSAGE_TIMEOUT = 10 * 1000;

const getReconnectDelay = (failureCount) => {
	const baseDelay = PROTOCOL_CONFIG.RECONNECT_BASE_DELAY;
	const maxDelay = PROTOCOL_CONFIG.RECONNECT_MAX_DELAY;
	const exponentialDelay = Math.min(baseDelay * Math.pow(2, failureCount), maxDelay);
	const jitter = exponentialDelay * 0.2 * (Math.random() - 0.5);
	return Math.floor(exponentialDelay + jitter);
};

// 연결 상태 관리
const setConnectionState = (ipaddress, newState) => {
	const oldState = state.connectionStates.get(ipaddress);
	if (oldState !== newState) {
		state.connectionStates.set(ipaddress, newState);
		console.log(`[${ipaddress}] 상태 변경: ${oldState || 'undefined'} → ${newState}`);
	}
};

const getConnectionState = (ipaddress) => {
	return state.connectionStates.get(ipaddress) || CONNECTION_STATE.DISCONNECTED;
};

const isCircuitOpen = (ipaddress) => {
	const failures = state.failureCount.get(ipaddress) || 0;
	return failures >= PROTOCOL_CONFIG.MAX_FAILURES;
};

// 연결 실패 카운트 관리
const incrementFailureCount = (ipaddress) => {
	const current = state.failureCount.get(ipaddress) || 0;
	const newCount = current + 1;
	state.failureCount.set(ipaddress, newCount);

	if (newCount >= PROTOCOL_CONFIG.MAX_FAILURES) {
		setTimeout(() => {
			state.failureCount.set(ipaddress, 0);
		}, PROTOCOL_CONFIG.CIRCUIT_BREAKER_TIMEOUT);
	}

	return newCount;
};

const resetFailureCount = (ipaddress) => {
	state.failureCount.set(ipaddress, 0);
};

// 리소스 정리 (상태 동기화 개선)
const cleanupConnection = (ipaddress) => {
	const connection = state.billboardConnections.get(ipaddress);
	if (connection?.socket) {
		try {
			connection.socket.removeAllListeners();
			if (!connection.socket.destroyed) {
				connection.socket.destroy();
			}
		} catch (error) {
			console.error(`[${ipaddress}] 소켓 정리 오류:`, error.message);
		}
	}

	state.billboardConnections.delete(ipaddress);
	state.lastActivityMap.delete(ipaddress);
	setConnectionState(ipaddress, CONNECTION_STATE.DISCONNECTED);

	// 재연결 타이머 정리
	const timer = state.reconnectTimers.get(ipaddress);
	if (timer) {
		clearTimeout(timer);
		state.reconnectTimers.delete(ipaddress);
	}

	console.log(`[${ipaddress}] 연결 리소스 정리 완료 - 상태: ${getConnectionState(ipaddress)}`);
};

// 재연결 스케줄링 
const scheduleReconnect = (ipaddress, port, controllerModel) => {
	const currentState = getConnectionState(ipaddress);
	if (currentState === CONNECTION_STATE.CONNECTING ||
		currentState === CONNECTION_STATE.CONNECTED ||
		currentState === CONNECTION_STATE.RECONNECTING) {
		console.log(`[${ipaddress}] 재연결 스킵 - 현재 상태: ${currentState}`);
		return;
	}

	if (isCircuitOpen(ipaddress)) {
		console.log(`[${ipaddress}] 써킷 브레이커 활성화로 재연결 스킵`);
		return;
	}

	// 기존 타이머 정리
	const existingTimer = state.reconnectTimers.get(ipaddress);
	if (existingTimer) {
		clearTimeout(existingTimer);
	}

	const failures = state.failureCount.get(ipaddress) || 0;
	const delay = getReconnectDelay(failures);

	console.log(`[${ipaddress}] ${delay}ms 후 재연결 예약 (실패 ${failures}회)`);
	setConnectionState(ipaddress, CONNECTION_STATE.RECONNECTING);

	const timer = setTimeout(async () => {
		state.reconnectTimers.delete(ipaddress);
		console.log(`[${ipaddress}] 예약된 재연결 시도`);
		await connectBillboardTcp(ipaddress, port, controllerModel);
	}, delay);

	state.reconnectTimers.set(ipaddress, timer);
};

const connectBillboardTcp = async (ipaddress, port, controllerModel) => {
	return new Promise(async (resolve) => {
		if (!ipaddress) {
			console.error('IP 주소가 제공되지 않음');
			return resolve(false);
		}

		const currentState = getConnectionState(ipaddress);

		// 이미 연결 중이거나 연결된 상태 체크
		if (currentState === CONNECTION_STATE.CONNECTING || currentState === CONNECTION_STATE.CONNECTED) {
			console.log(`[${ipaddress}] 연결 스킵 - 현재 상태: ${currentState}`);
			return resolve(true);
		}

		// 써킷 브레이커 체크
		if (isCircuitOpen(ipaddress)) {
			console.log(`[${ipaddress}] 써킷 브레이커로 인한 연결 차단`);
			await updateBillboardStatusInDB(ipaddress, false);
			return resolve(false);
		}

		// 기존 연결 정리
		cleanupConnection(ipaddress);

		setConnectionState(ipaddress, CONNECTION_STATE.CONNECTING);
		console.log(`[${ipaddress}] TCP 연결 시도 시작`);

		const socket = net.connect({ host: ipaddress, port });
		socket.setEncoding('binary');
		socket.setKeepAlive(true, PROTOCOL_CONFIG.KEEP_ALIVE_INTERVAL);

		// 연결 타임아웃 설정
		const connectionTimeout = setTimeout(() => {
			console.log(`[${ipaddress}] 연결 타임아웃`);
			socket.destroy();
		}, PROTOCOL_CONFIG.TIMEOUT_DURATION);

		let isResolved = false;
		const resolveOnce = (result) => {
			if (!isResolved) {
				isResolved = true;
				clearTimeout(connectionTimeout);
				resolve(result);
			}
		};

		socket.once('connect', async () => {
			console.log(`[${ipaddress}] TCP 연결 성공`);

			// 연결 정보 저장
			state.billboardConnections.set(ipaddress, {
				ipaddress,
				port,
				socket,
				controllerModel,
				connectedAt: Date.now()
			});

			setConnectionState(ipaddress, CONNECTION_STATE.CONNECTED);
			resetFailureCount(ipaddress);
			state.lastActivityMap.set(ipaddress, Date.now());

			try {
				await updateBillboardStatusInDB(ipaddress, true);
				console.log(`[${ipaddress}] 연결 성공 - 총 연결된 전광판: ${state.billboardConnections.size}개`);

				await retryPendingMessage(ipaddress);
				resolveOnce(true);
			} catch (error) {
				console.error(`[${ipaddress}] DB 업데이트 실패:`, error.message);
				resolveOnce(true);
			}
		});

		socket.on('data', (data) => {
			state.lastActivityMap.set(ipaddress, Date.now());
			try {
				const responseStr = iconv.decode(data, 'EUC-KR');
				console.log(`[${ipaddress}] 응답 수신: ${responseStr.replace(/\r?\n/g, '\\n')}`);
			} catch (error) {
				console.error(`[${ipaddress}] 응답 디코딩 오류:`, error.message);
			}
		});

		socket.once('error', (error) => {
			console.error(`[${ipaddress}] 소켓 에러:`, error.message);

			if (!isResolved) {
				const failures = incrementFailureCount(ipaddress);
				setConnectionState(ipaddress, CONNECTION_STATE.FAILED);

				updateBillboardStatusInDB(ipaddress, false).catch(dbError =>
					console.error(`[${ipaddress}] DB 업데이트 실패:`, dbError.message)
				);

				if (!isCircuitOpen(ipaddress)) {
					scheduleReconnect(ipaddress, port, controllerModel);
				}

				resolveOnce(false);
			}
		});

		socket.once('close', () => {
			console.log(`[${ipaddress}] 소켓 연결 종료`);

			const wasConnected = getConnectionState(ipaddress) === CONNECTION_STATE.CONNECTED;
			setConnectionState(ipaddress, CONNECTION_STATE.DISCONNECTED);

			cleanupConnection(ipaddress);

			updateBillboardStatusInDB(ipaddress, false).catch(dbError =>
				console.error(`[${ipaddress}] DB 업데이트 실패:`, dbError.message)
			);

			// 정상 연결 후 종료된 경우에만 재연결 시도
			if (wasConnected && !isCircuitOpen(ipaddress)) {
				console.log(`[${ipaddress}] 정상 연결 후 종료로 재연결 예약`);
				scheduleReconnect(ipaddress, port, controllerModel);
			}

			if (!isResolved) {
				resolveOnce(false);
			}
		});

		socket.once('end', () => {
			console.log(`[${ipaddress}] 서버가 연결 종료 신호 전송`);
		});
	});
};

const retryPendingMessage = async (ipaddress) => {
	if (state.messageMap.has(ipaddress)) {
		console.log(`[${ipaddress}] 저장된 메시지 재전송 시도`);
		const { billboard_msg, id, billboard_controller_model, billboard_color, billboard_type } = state.messageMap.get(ipaddress);
		await sendToBillboard(ipaddress, billboard_msg, billboard_color, billboard_type, id, billboard_controller_model, billboard_controller_model);
	}
};

const writeData = (socket, data, ipaddress) => {
	return new Promise((resolve, reject) => {
		if (!socket || socket.destroyed || !socket.writable) {
			const error = new Error(`소켓 사용 불가: ${ipaddress}`);
			console.error(error.message);
			return reject(error);
		}

		const timeout = setTimeout(() => {
			const error = new Error(`메시지 전송 타임아웃: ${ipaddress}`);
			console.error(error.message);
			reject(error);
		}, MESSAGE_TIMEOUT);

		let isResolved = false;
		const resolveOnce = (result, error = null) => {
			if (!isResolved) {
				isResolved = true;
				clearTimeout(timeout);
				if (error) reject(error);
				else resolve(result);
			}
		};

		socket.write(data, (err) => {
			if (err) {
				console.error(`[${ipaddress}] 쓰기 오류:`, err.message);
				resolveOnce(null, err);
			} else {
				console.log(`[${ipaddress}] 데이터 전송 성공`);
				state.lastActivityMap.set(ipaddress, Date.now());
				resolveOnce(true);
			}
		});

		socket.once('error', (err) => {
			console.error(`[${ipaddress}] 전송 중 소켓 에러:`, err.message);
			resolveOnce(null, err);
		});
	});
};

const startHealthCheck = () => {
	if (state.healthCheckInterval) {
		clearInterval(state.healthCheckInterval);
	}

	state.healthCheckInterval = setInterval(() => {
		const now = Date.now();
		const connectionsToCheck = [];

		state.billboardConnections.forEach((connection, ipaddress) => {
			const lastActivity = state.lastActivityMap.get(ipaddress) || 0;
			const inactiveTime = now - lastActivity;
			const currentState = getConnectionState(ipaddress);

			if (currentState === CONNECTION_STATE.CONNECTED && inactiveTime > PROTOCOL_CONFIG.MAX_INACTIVE_TIME) {
				connectionsToCheck.push({ ipaddress, connection });
			}
		});

		connectionsToCheck.forEach(({ ipaddress, connection }) => {
			cleanupConnection(ipaddress);
			scheduleReconnect(ipaddress, connection.port, connection.controllerModel);
		});

		// 상태 요약 로그
		const stats = getConnectionStats();
		console.log(`헬스체크: 연결 ${stats.totalConnections}개 (성공: ${stats.connectionsByState.connected || 0}, 재연결중: ${stats.connectionsByState.reconnecting || 0})`);
	}, PROTOCOL_CONFIG.HEALTH_CHECK_INTERVAL);

};

const stopHealthCheck = () => {
	if (state.healthCheckInterval) {
		clearInterval(state.healthCheckInterval);
		state.healthCheckInterval = null;
		console.log('헬스체크 중단됨');
	}
};

const createBillboardMessage = (message, colors, type) => {
	
	const colorMap = {
		'red': 1,
		'green': 2,
		'yellow': 3,
		'default': 0
	};

	const colorCodes = colors ? colors.split(',').map(c => colorMap[c.toLowerCase().trim()] || colorMap['default']) : [];
	let packet = '';
	let pwait = 30;

	const messageLines = message.split('\n').filter(line => line.trim() !== '');
	const lineCount = messageLines.length;

	// 전광판 크기 고려한 폰트 크기 계산
	let fontConfig;
	if (lineCount === 1) {
		fontConfig = { fw: 16, fh: 32, lineHeight: 32 };
	} else if (lineCount === 2) {
		fontConfig = { fw: 16, fh: 32, lineHeight: 32 };
	} else if (lineCount <= 4) {
		fontConfig = { fw: 8, fh: 16, lineHeight: 16 };
	} else {
		fontConfig = { fw: 6, fh: 12, lineHeight: 12 };
	}

	const messageType = (type || 'vms').toLowerCase();

	switch (messageType) {
		case 'vms': {
			packet += '[SnrLoad]\r';
			packet += '[SnrInit]\r';
			packet += `[Page999 pWait 0, ${pwait}]\r`;

			messageLines.forEach((text, index) => {
				const yp = index * fontConfig.lineHeight;
				const colorCode = colorCodes[index] !== undefined ? colorCodes[index] : colorMap['default'];
				packet += `[Ln${index + 1} Align0 Yp${yp} Xp0][Fw${fontConfig.fw} Fh${fontConfig.fh} Ft1 Cr${colorCode}]${text}\r`;
			});
			packet += '[SnrEnd]\r';
			packet += '[SnrSave]\r';
			break;
		}
		case 'lcs': {
			const itemNumber = message.trim();
			if (!itemNumber) {
				throw new Error('LCS 메시지는 아이템번호가 존재해야 함');
			}
			packet += '[SnrLoad]\r';
			packet += '[SnrInit]\r';
			packet += `[Page999 pWait 0, ${pwait}]\r`;
			packet += `[Ln99 Xp0 Yp0 Xs64 Ys96][Fw32 Fh96][Item${itemNumber}]\r`;
			packet += '[SnrEnd]\r';
			packet += '[SnrSave]\r';
			break;
		}
		default: {
			console.warn(`알 수 없는 전광판 타입: ${type}, 기본 VMS 타입으로 처리`);
			packet += '[SnrLoad]\r';
			packet += '[SnrInit]\r';
			packet += `[Page999 pWait 0, ${pwait}]\r`;

			messageLines.forEach((text, index) => {
				const yp = index * fontConfig.lineHeight;
				const colorCode = colorCodes[index] !== undefined ? colorCodes[index] : colorMap['default'];
				packet += `[Ln${index + 1} Align0 Yp${yp} Xp0][Fw${fontConfig.fw} Fh${fontConfig.fh} Ft1 Cr${colorCode}]${text}\r`;
			});
			packet += '[SnrEnd]\r';
			packet += '[SnrSave]\r';
			break;
		}
	}
	return iconv.encode(packet, 'EUC-KR');
};

const getStringColor = (string, color) => {
	const colorMap = {
		'red': '01',
		'green': '02',
		'yellow': '03'
	};
	const strColor = colorMap[color.toLowerCase()] || '01'; 
	let result = '';
	const patternKorean = /[가-힣]/;
	for (let i = 0; i < string.length; i++) {
		const char = string.charAt(i);
		if (patternKorean.test(char)) {
			result += strColor + '00'; 
		} else {
			result += strColor; 
		}
	}
	return result;
};

const createDabitBillboardMessage = (message, pageIndex = '00', color, fontSize = '07', maxLength = 12) => {
	const stx = "1002";
	const etx = "1003";
	const id = "00";
	const cmd = "94";
	const attributes = `${pageIndex}00630100${fontSize}01010014000000000000`;
	const encodedMsg = iconv.encode(message, 'euc-kr');
	const notiString = encodedMsg.toString('hex');
	const stringColor = getStringColor(message, color);

	const dataBody = cmd + attributes + stringColor + notiString;
	const len = (dataBody.length / 2).toString(16).padStart(4, '0');
	const data = stx + id + len + dataBody + etx;

	console.log('Generated billboard message:', data);
	return Buffer.from(data, 'hex');
};

const sendToBillboard = async (ipaddress, message, color, type, id, controllerModel = '', controller_type = '', manufacturer, billboard_ips = []) => {
	let connectionBillboard = [];

	try {
		const billboardMessage = manufacturer === 'Y-Control' ? createBillboardMessage(message, color, controller_type) : createDabitBillboardMessage(message, '00', color);

		if (type === 'groupBillboards') {
			if (!billboard_ips || !billboard_ips.length) {
				console.warn('groupBillboards 타입에서 billboard_ips가 비어있음');
				return { list: [], success: [] };
			}

			for (const ip of billboard_ips) {
				const currentState = getConnectionState(ip);
				console.log(`[${ip}] 그룹 메시지 전송 시도 - 현재 상태: ${currentState}`);

				if (currentState !== CONNECTION_STATE.CONNECTED) {
					console.log(`[${ip}] 연결되지 않음, 연결 시도`);
					const connected = await connectBillboardTcp(ip, 5000, controllerModel);
					if (!connected) {
						state.messageMap.set(ip, {
							billboard_msg: message,
							billboard_color: color,
							id,
							billboard_controller_model: controllerModel,
							billboard_type: type
						});
						state.billboardsStatusCheck.push(ip);
						await updateBillboardStatusInDB(ip, false);
						continue;
					}
				}

				const connection = state.billboardConnections.get(ip);
				if (connection?.socket && !connection.socket.destroyed && getConnectionState(ip) === CONNECTION_STATE.CONNECTED) {
					try {
						await writeData(connection.socket, billboardMessage, ip);
						connectionBillboard.push(ip);
						addOperLog({
							logAction: 'contentsUpdate',
							operatorId: id,
							logType: 'contentsUpdate',
							logDescription: `그룹 tm_전광판(${ip}) 문구 변경 성공`,
							reqIp: ''
						});
						state.messageMap.delete(ip);
					} catch (err) {
						console.error(`[${ip}] 그룹 메시지 전송 실패:`, err.message);
						state.messageMap.set(ip, {
							billboard_msg: message,
							billboard_color: color,
							id,
							billboard_controller_model: controllerModel,
							billboard_type: type
						});
						state.billboardsStatusCheck.push(ip);
						await updateBillboardStatusInDB(ip, false);
						cleanupConnection(ip); // 전송 실패시 연결 정리
						scheduleReconnect(ip, 5000, controllerModel);
					}
				} else {
					console.log(`[${ip}] 소켓 상태 불일치, 재연결 예약`);
					cleanupConnection(ip);
					scheduleReconnect(ip, 5000, controllerModel);
				}
			}
		} else if (type === 'allBillboards') {
			for (const [ip, connection] of state.billboardConnections) {
				const currentState = getConnectionState(ip);
				console.log(`[${ip}] 전체 메시지 전송 시도 - 현재 상태: ${currentState}`);

				if (currentState === CONNECTION_STATE.CONNECTED && connection.socket && !connection.socket.destroyed) {
					try {
						await writeData(connection.socket, billboardMessage, ip);
						connectionBillboard.push(ip);
						addOperLog({
							logAction: 'contentsUpdate',
							operatorId: id,
							logType: 'contentsUpdate',
							logDescription: `전체 tm_전광판(${ip}) 문구 변경 성공`,
							reqIp: ''
						});
						state.messageMap.delete(ip);
					} catch (err) {
						console.error(`[${ip}] 전체 메시지 전송 실패:`, err.message);
						state.messageMap.set(ip, {
							billboard_msg: message,
							billboard_color: color,
							id,
							billboard_controller_model: controllerModel,
							billboard_type: type
						});
						state.billboardsStatusCheck.push(ip);
						await updateBillboardStatusInDB(ip, false);
						cleanupConnection(ip);
						scheduleReconnect(ip, connection.port, connection.controllerModel);
					}
				}
			}
		} else {
			const currentState = getConnectionState(ipaddress);
			if (currentState !== CONNECTION_STATE.CONNECTED) {
				const connected = await connectBillboardTcp(ipaddress, 5000, controllerModel);
				if (!connected) {
					state.messageMap.set(ipaddress, {
						billboard_msg: message,
						billboard_color: color,
						id,
						billboard_controller_model: controllerModel,
						billboard_type: type
					});
					state.billboardsStatusCheck.push(ipaddress);
					await updateBillboardStatusInDB(ipaddress, false);
					return { list: [ipaddress], success: [] };
				}
			}

			const connection = state.billboardConnections.get(ipaddress);
			if (connection?.socket && !connection.socket.destroyed && getConnectionState(ipaddress) === CONNECTION_STATE.CONNECTED) {
				try {
					await writeData(connection.socket, billboardMessage, ipaddress);
					connectionBillboard.push(ipaddress);
					addOperLog({
						logAction: 'contentsUpdate',
						operatorId: id,
						logType: 'contentsUpdate',
						logDescription: `tm_전광판(${ipaddress}) 문구 변경 성공`,
						reqIp: ''
					});
					state.messageMap.delete(ipaddress);
				} catch (err) {
					console.error(`[${ipaddress}] 메시지 전송 실패:`, err.message);
					state.messageMap.set(ipaddress, {
						billboard_msg: message,
						billboard_color: color,
						id,
						billboard_controller_model: controllerModel,
						billboard_type: type || 'vms'
					});
					state.billboardsStatusCheck.push(ipaddress);
					await updateBillboardStatusInDB(ipaddress, false);
					cleanupConnection(ipaddress);
					scheduleReconnect(ipaddress, 5000, controllerModel);
				}
			} else {
				console.log(`[${ipaddress}] 소켓 상태 불일치, 정리 후 재연결`);
				cleanupConnection(ipaddress);
				scheduleReconnect(ipaddress, 5000, controllerModel);
			}
		}
	} catch (error) {
		console.error(`tm_전광판 메시지 전송 오류(${ipaddress}):`, error.message);
		state.billboardsStatusCheck.push(ipaddress);
		try {
			await updateBillboardStatusInDB(ipaddress, false);
		} catch (dbError) {
			console.error(`[${ipaddress}] DB 업데이트 실패:`, dbError.message);
		}
	}

	return {
		list: state.addedBillboards.filter(ele => !connectionBillboard.includes(ele)),
		success: connectionBillboard
	};
};

const handleBillboardManagement = async (data) => {
	if (!data?.cmd || !data?.ipaddress) return;
	const { cmd, ipaddress, id, port, controllerModel } = data;

	if (cmd === 'add') {
		if (!state.addedBillboards.includes(ipaddress)) {
			console.log(`[${ipaddress}] tm_전광판 추가 연결 (${controllerModel})`);
			const connected = await connectBillboardTcp(ipaddress, port, controllerModel);
			if (connected) {
				state.addedBillboards.push(ipaddress);
				addOperLog({
					logAction: 'tm_전광판 추가',
					operatorId: id,
					logType: 'tm_전광판 추가',
					logDescription: `tm_전광판 추가 성공: ${ipaddress}`,
					reqIp: ''
				});
			}
		}
	} else if (cmd === 'remove') {
		console.log(`[${ipaddress}] tm_전광판 연결 해제`);
		cleanupConnection(ipaddress);
		addOperLog({
			logAction: 'tm_전광판 제거',
			operatorId: id,
			logType: 'tm_전광판 제거',
			logDescription: `tm_전광판 제거 성공: ${ipaddress}`,
			reqIp: ''
		});
		state.addedBillboards = state.addedBillboards.filter(board => board !== ipaddress);
		setConnectionState(ipaddress, CONNECTION_STATE.DISCONNECTED);
	}
};

const updateBillboardStatusInDB = async (ipaddress, status) => {
	let client;
	try {
		client = await pool.connect();

		const query = `UPDATE tm_billboard SET linked_status=$1 WHERE billboard_ip=$2`;
		const values = [status, ipaddress];

		const res = await client.query(query, values);

		if (res && res.rowCount > 0) {
			global.websocket.emit('tm_areaList-update', { areaList: res.rowCount });
			global.websocket.emit('tm_billboards-update', { billboards: res.rowCount });
		}
		return res.rowCount > 0;
	} catch (error) {
		console.error(`[${ipaddress}] DB 업데이트 실패:`, error.message);
		return false;
	} finally {
		if (client) {
			client.release();
		}
	}
};

let isInitializing = false;
const initializeBillboards = async () => {
	if (isInitializing) {
		console.log('tm_전광판 초기화 진행 중, 중복 방지');
		return;
	}
	isInitializing = true;
	let client;
	try {
		client = await pool.connect();
		const query = `SELECT * FROM tm_billboard`;
		const result = await client.query(query);

		if (result?.rows?.length > 0) {
			console.log(`${result.rows.length}개의 tm_전광판 초기화 시작`);
			const connectionPromises = result.rows.map(async (billboard) => {
				const ipaddress = billboard.billboard_ip;
				const port = billboard.billboard_port;
				const controllerModel = billboard.billboard_controller_model;

				if (ipaddress && !state.addedBillboards.includes(ipaddress)) {
					console.log(`[${ipaddress}] 초기화 연결 시도 - ${controllerModel}`);
					const isConnected = await connectBillboardTcp(ipaddress, port, controllerModel);
					if (isConnected) {
						state.addedBillboards.push(ipaddress);
						console.log(`[${ipaddress}] 초기화 성공`);
						return { ip: ipaddress, success: true };
					} else {
						console.log(`[${ipaddress}] 초기화 실패`);
						await updateBillboardStatusInDB(ipaddress, false);
						return { ip: ipaddress, success: false };
					}
				}
				return { ip: ipaddress, success: false, reason: 'already_added' };
			});

			const results = await Promise.allSettled(connectionPromises);

			const successful = results.filter(result =>
				result.status === 'fulfilled' && result.value.success
			).length;

			const failed = results.filter(result =>
				result.status === 'rejected' || !result.value.success
			).length;

			console.log(`tm_전광판 초기화 완료 - 성공: ${successful}개, 실패: ${failed}개, 총 연결: ${state.billboardConnections.size}개`);
		} else {
			console.log('초기화할 tm_전광판 데이터 없음');
		}
	} catch (error) {
		console.error('tm_전광판 초기화 오류:', error.message);
	} finally {
		if (client) {
			client.release();
		}
		isInitializing = false;
	}
};

const checkingShutdown = () => {
	stopHealthCheck();

	// 모든 재연결 타이머 정리
	state.reconnectTimers.forEach((timer, ip) => {
		console.log(`[${ip}] 재연결 타이머 정리`);
		clearTimeout(timer);
	});
	state.reconnectTimers.clear();

	// 모든 소켓 연결 정리
	state.billboardConnections.forEach((connection, ip) => {
		console.log(`[${ip}] 연결 정리`);
		cleanupConnection(ip);
	});

	console.log('서버 종료 완료');
	process.exit(0);
};

const init = async (io) => {
	console.log('tm_전광판 TCP 모듈 초기화 시작');

	await initializeBillboards();
	startHealthCheck();

	io.on('connection', (socket) => {
		console.log(`Billboard Socket Connected: ${socket.handshake.address}/${socket.id}`);
		socket.on('manageBillboard', (data) => handleBillboardManagement(data));
	});

	process.on('SIGINT', checkingShutdown);
	process.on('SIGTERM', checkingShutdown);

	console.log('tm_전광판 TCP 모듈 초기화 완료');
};

// 디버깅 함수
const getConnectionStats = () => {
	const stats = {
		totalConnections: state.billboardConnections.size,
		connectionsByState: {},
		failureCounts: Object.fromEntries(state.failureCount),
		pendingMessages: state.messageMap.size,
		activeTimers: state.reconnectTimers.size
	};

	for (const state of Object.values(CONNECTION_STATE)) {
		stats.connectionsByState[state] = 0;
	}

	state.connectionStates.forEach((connectionState) => {
		stats.connectionsByState[connectionState]++;
	});

	return stats;
};

module.exports = {
	init,
	sendToBillboard,
	getConnectionStats,
	_internal: {
		state,
		CONNECTION_STATE,
		cleanupConnection,
		scheduleReconnect
	}
};