const net = require('net');
const { addOperLog } = require('../../utils/addOperLog');
const iconv = require('iconv-lite');
const { pool } = require('../../db/postgresqlPool');
const logger = require('../../logger');

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
	failureCount: new Map(),
	retryCounts: new Map()
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
		logger.info(`[${ipaddress}] 상태 변경: ${oldState || 'undefined'} → ${newState}`);
	}
};

const getConnectionState = (ipaddress) => {
	return state.connectionStates.get(ipaddress) || CONNECTION_STATE.DISCONNECTED;
};

const isCircuitOpen = (ipaddress) => {
	const failures = state.failureCount.get(ipaddress) || 0;
	return failures >= PROTOCOL_CONFIG.MAX_FAILURES;
};

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

	logger.info(`[${ipaddress}] 연결 리소스 정리 완료 - 상태: ${getConnectionState(ipaddress)}`);
};
const buildDisplayPacket = (messageData) => {
	try {
		const jsonString = JSON.stringify(messageData);
		return Buffer.from(jsonString, 'utf-8');
	} catch (error) {
		throw new Error('메시지 생성 실패');
	}
};

const handleGreenParkingResponse = (data, ipaddress) => {
	const dataStr = data.toString('utf8').trim();
	logger.info(`수신 데이터(${ipaddress}): [${dataStr}] (Hex: ${data.toString('hex')})`);

	if (isKeepAliveMessage(dataStr)) {
		logger.info(`Keep-alive received from ${ipaddress}`);
		return { type: 'keep_alive' };
	}

	if (dataStr.includes('OK')) {
		logger.info(`그린파킹 메시지 처리 성공: ${ipaddress}`);
		return { type: 'success' };
	} else if (dataStr.includes('Error')) {
		console.error(`그린파킹 메시지 처리 실패: ${ipaddress}`);
		return { type: 'error', message: dataStr };
	}

	logger.info(`그린파킹 기타 응답(${ipaddress}): ${dataStr}`);
	return { type: 'unknown', message: dataStr };
};

const isKeepAliveMessage = (data) => {
	try {
		const parsed = JSON.parse(data);
		logger.info(`Keep-alive 파싱 성공: ${JSON.stringify(parsed)}`);
		return parsed.kind === 'keep_alive';
	} catch (e) {
		console.error(`Keep-alive 파싱 오류: ${e.message}`);
		return false;
	}
};

// 재연결 스케줄링 
const scheduleReconnect = (ipaddress, port, controllerModel) => {
	const currentState = getConnectionState(ipaddress);
	if (currentState === CONNECTION_STATE.CONNECTING ||
		currentState === CONNECTION_STATE.CONNECTED ||
		currentState === CONNECTION_STATE.RECONNECTING) {
		logger.info(`[${ipaddress}] 재연결 스킵 - 현재 상태: ${currentState}`);
		return;
	}

	if (isCircuitOpen(ipaddress)) {
		logger.info(`[${ipaddress}] 써킷 브레이커 활성화로 재연결 스킵`);
		return;
	}

	const existingTimer = state.reconnectTimers.get(ipaddress);
	if (existingTimer) {
		clearTimeout(existingTimer);
	}

	const failures = state.failureCount.get(ipaddress) || 0;
	const delay = getReconnectDelay(failures);

	logger.info(`[${ipaddress}] ${delay}ms 후 재연결 예약 (실패 ${failures}회)`);
	setConnectionState(ipaddress, CONNECTION_STATE.RECONNECTING);

	const timer = setTimeout(async () => {
		state.reconnectTimers.delete(ipaddress);
		logger.info(`[${ipaddress}] 예약된 재연결 시도`);
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

		if (currentState === CONNECTION_STATE.CONNECTING || currentState === CONNECTION_STATE.CONNECTED) {
			logger.info(`[${ipaddress}] 연결 스킵 - 현재 상태: ${currentState}`);
			return resolve(true);
		}

		if (isCircuitOpen(ipaddress)) {
			logger.info(`[${ipaddress}] 써킷 브레이커로 인한 연결 차단`);
			await updateBillboardStatusInDB(ipaddress, false);
			return resolve(false);
		}

		cleanupConnection(ipaddress);

		setConnectionState(ipaddress, CONNECTION_STATE.CONNECTING);
		logger.info(`[${ipaddress}] TCP 연결 시도 시작`);

		const socket = net.connect({ host: ipaddress, port });
		socket.setEncoding('binary');
		if (controllerModel !== '그린파킹') {
			socket.setKeepAlive(true, PROTOCOL_CONFIG.KEEP_ALIVE_INTERVAL);
		}

		const connectionTimeout = setTimeout(() => {
			logger.info(`[${ipaddress}] 연결 타임아웃`);
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
			logger.info(`[${ipaddress}] TCP 연결 성공`);

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
				logger.info(`[${ipaddress}] 연결 성공 - 총 연결된 전광판: ${state.billboardConnections.size}개`);

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
				logger.info(`[${ipaddress}] 응답 수신: ${responseStr.replace(/\r?\n/g, '\\n')}`);
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
			logger.info(`[${ipaddress}] 소켓 연결 종료`);

			const wasConnected = getConnectionState(ipaddress) === CONNECTION_STATE.CONNECTED;
			setConnectionState(ipaddress, CONNECTION_STATE.DISCONNECTED);

			cleanupConnection(ipaddress);

			updateBillboardStatusInDB(ipaddress, false).catch(dbError =>
				console.error(`[${ipaddress}] DB 업데이트 실패:`, dbError.message)
			);

			if (wasConnected && !isCircuitOpen(ipaddress)) {
				logger.info(`[${ipaddress}] 정상 연결 후 종료로 재연결 예약`);
				scheduleReconnect(ipaddress, port, controllerModel);
			}

			if (!isResolved) {
				resolveOnce(false);
			}
		});

		socket.once('end', () => {
			logger.info(`[${ipaddress}] 서버가 연결 종료 신호 전송`);
		});
	});
};

const retryPendingMessage = async (ipaddress) => {
	if (state.messageMap.has(ipaddress)) {
		logger.info(`저장된 메시지 재전송 시도: ${ipaddress}`);
		const { billboard_msg, id, billboard_controller_model } = state.messageMap.get(ipaddress);
		await sendToGreenParkingBillboard(ipaddress, billboard_msg, id, billboard_controller_model);
	}
};

const writeDataToGreenParking = (socket, data, ipaddress, maxRetryCount = 3, delay = 2000) => {
	return new Promise((resolve, reject) => {
		let retries = 0;
		let buffer = '';

		const attemptWrite = () => {
			if (!socket.writable) {
				logger.info(`소켓 쓰기 불가능: ${ipaddress}`);
				retry();
				return;
			}

			logger.info(`메시지 전송 시도: ${ipaddress}, Data: ${data.toString('hex')}`);
			socket.write(data, (err) => {
				if (err) {
					console.error(`쓰기 오류(${ipaddress}): ${err.message}`);
					retry();
				} else {
					logger.info(`데이터 전송 완료: ${ipaddress}`);
				}
			});

			const timeoutId = setTimeout(() => {
				logger.info(`타임아웃: ${ipaddress}`);
				socket.destroy();
				reject(new Error(`타임아웃: ${ipaddress}`));
			}, PROTOCOL_CONFIG.TIMEOUT_DURATION);

			socket.once('data', (response) => {
				clearTimeout(timeoutId);
				buffer += response.toString('utf8').trim();
				logger.info(`수신 데이터(${ipaddress}): ${buffer} (Hex: ${response.toString('hex')})`);

				try {
					const parsed = JSON.parse(buffer);
					if (parsed.kind === 'keep_alive' || buffer.includes('OK')) {
						logger.info(`메시지 전송 성공: ${ipaddress} (Keep-alive or OK)`);
						socket.destroy();
						resolve(true);
					} else if (buffer.includes('Error')) {
						console.error(`에러 응답: ${ipaddress} - ${buffer}`);
						socket.destroy();
						reject(new Error(`에러 응답: ${ipaddress} - ${buffer}`));
					} else {
						logger.info(`유효하지 않은 응답, 재시도: ${ipaddress} - ${buffer}`);
						retry();
					}
				} catch (e) {
					console.error(`JSON 파싱 오류(${ipaddress}): ${e.message}, Data: ${buffer}`);
					retry();
				}
			});

			socket.once('error', (err) => {
				clearTimeout(timeoutId);
				console.error(`소켓 에러(${ipaddress}): ${err.message}`);
				socket.destroy();
				retry();
			});
		};

		const retry = () => {
			if (retries >= maxRetryCount) {
				console.error(`최대 재시도 횟수 초과(${maxRetryCount}): ${ipaddress}`);
				reject(new Error(`Failed to write to ${ipaddress} after ${maxRetryCount} retries`));
				return;
			}
			retries++;
			logger.info(`재시도 ${retries}/${maxRetryCount}: ${ipaddress}`);
			setTimeout(attemptWrite, delay);
		};

		attemptWrite();
	});
};

const writeData = (socket, data, maxRetryCount = 3, delay = 2000, ipaddress = '') => {
	if (state.billboardConnections.get(ipaddress)?.controllerModel === '그린파킹') {
		return writeDataToGreenParking(socket, data, ipaddress, maxRetryCount, delay);
	}

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
				logger.info(`[${ipaddress}] 데이터 전송 성공`);
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

const sendToGreenParkingBillboard = async (billboard_ip, billboard_msg, id, billboard_controller_model) => {
	let connectionBillboard = [];

	try {
		if (billboard_controller_model === '그린파킹') {
			let findSocket = state.billboardConnections.get(billboard_ip);
			if (!findSocket) {
				logger.info(`전광판(${billboard_ip}) 소켓 연결 없음, 연결 시도`);
				const connected = await connectBillboardTcp(billboard_ip, 9090, '그린파킹');
				if (!connected) {
					state.messageMap.set(billboard_ip, { billboard_msg, id, billboard_controller_model });
					throw new Error(`소켓 연결 실패: ${billboard_ip}`);
				}
				findSocket = state.billboardConnections.get(billboard_ip);
			}

			if (findSocket?.socket && !findSocket.socket.destroyed) {
				const messageData = {
					video: { filename: "", play: 0 },
					image: { filename: "", play: 0 },
					first: { text: billboard_msg.first.text, color: billboard_msg.first.color, effect: billboard_msg.first.effect },
					second: { text: billboard_msg.second.text, color: billboard_msg.second.color, effect: billboard_msg.second.effect },
					third: { text: "", color: 1, effect: 0 },
					fourth: { text: "", color: 1, effect: 0 },
					mode: 2,
					bright_max_start: 0,
					bright_max_stop: 24,
					bright_min_value: 100
				};

				const greenParkingMessage = buildDisplayPacket({ ...messageData });
				try {
					await writeDataToGreenParking(findSocket.socket, greenParkingMessage, billboard_ip);
					connectionBillboard.push(billboard_ip);
					addOperLog({
						logAction: 'contentsUpdate',
						operatorId: id,
						logType: 'contentsUpdate',
						logDescription: `전광판(${billboard_ip}) 문구 변경 성공`,
						reqIp: ''
					});
					state.messageMap.delete(billboard_ip);
				} catch (writeError) {
					console.error(`데이터 전송 실패: ${billboard_ip}, ${writeError.message}`);
					if (!state.messageMap.has(billboard_ip)) {
						state.messageMap.set(billboard_ip, { billboard_msg, id, billboard_controller_model });
					}
					throw writeError;
				}
			} else {
				throw new Error(`소켓 연결 실패 또는 파괴됨: ${billboard_ip}`);
			}
		}
	} catch (error) {
		console.error('그린파킹 메시지 전송 오류:', error.message);
		state.billboardsStatusCheck.push(billboard_ip);
		await updateBillboardStatusInDB(billboard_ip, false);
	}

	logger.info(`Returning result - list: ${state.addedBillboards.filter(ele => !connectionBillboard.includes(ele))}, success: ${connectionBillboard}`);
	return {
		list: state.addedBillboards.filter(ele => !connectionBillboard.includes(ele)),
		success: connectionBillboard
	};
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
		if (char !== ' ' && patternKorean.test(char)) {
			result += strColor + '00';
		} else {
			result += strColor;
		}
	}
	return result;
};

const createBillboardMessage = (message, pageIndex = '00', color, fontSize = '03', maxLength = 12) => {
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

    logger.info('Generated billboard message:', data);
    return Buffer.from(data, 'hex');
};

const sendToBillboard = async (ipaddress, message, color, type, id, controllerModel, billboard_ips = []) => {
	let connectionBillboard = [];
	try {
		const billboardMessage = createBillboardMessage(message, '00', color);

		if (type === 'groupBillboards') {
			if (!billboard_ips.length) {
				return { list: [], success: [] };
			}

			for (const ip of billboard_ips) {
				const findSocket = state.billboardConnections.get(ip);
				if (findSocket) {
					try {
						await writeData(findSocket.socket, billboardMessage, 3, 2000, ip);
						connectionBillboard.push(ip);
						addOperLog({
							logAction: 'contentsUpdate',
							operatorId: id,
							logType: 'contentsUpdate',
							logDescription: `그룹 전광판(${ip}) 문구 변경 성공`,
							reqIp: ''
						});
					} catch (err) {
						state.billboardsStatusCheck.push(ip);
						await updateBillboardStatusInDB(ip, false);
					}
				}
			}
		} else if (type === 'allBillboards') {
			for (const [ip, billboard] of state.billboardConnections) {
				try {
					await writeData(billboard.socket, billboardMessage, 3, 2000, ip);
					connectionBillboard.push(ip);
					addOperLog({
						logAction: 'contentsUpdate',
						operatorId: id,
						logType: 'contentsUpdate',
						logDescription: `전체 전광판 문구 변경 성공`,
						reqIp: ''
					});
				} catch (err) {
					state.billboardsStatusCheck.push(ip);
					await updateBillboardStatusInDB(ip, false);
				}
			}
		} else {
			const connection = state.billboardConnections.get(ipaddress);
			if (connection?.socket && !connection.socket.destroyed && getConnectionState(ipaddress) === CONNECTION_STATE.CONNECTED) {
				try {
					await writeData(connection.socket, billboardMessage, 3, 2000, ipaddress);
					connectionBillboard.push(ipaddress);
					addOperLog({
						logAction: 'contentsUpdate',
						operatorId: id,
						logType: 'contentsUpdate',
						logDescription: `전광판(${ipaddress}) 문구 변경 성공`,
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
				logger.info(`[${ipaddress}] 소켓 상태 불일치, 정리 후 재연결`);
				cleanupConnection(ipaddress);
				scheduleReconnect(ipaddress, 5000, controllerModel);
			}
		}
	} catch (error) {
		console.error(`전광판 메시지 전송 오류(${ipaddress}):`, error.message);
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
			logger.info(`${ipaddress} 전광판 추가 연결 (${controllerModel})`);
			const connected = await connectBillboardTcp(ipaddress, port, controllerModel);
			if (connected) {
				state.addedBillboards.push(ipaddress);
				addOperLog({
					logAction: '전광판 추가',
					operatorId: id,
					logType: '전광판 추가',
					logDescription: `전광판 추가 성공: ${ipaddress}`,
					reqIp: ''
				});
			}
		}
	} else if (cmd === 'remove') {
		logger.info(`${ipaddress} 전광판 연결 해제`);
		const targetSocket = state.billboardConnections.get(ipaddress);
		if (targetSocket?.socket) {
			targetSocket.socket.destroy();
		}
		addOperLog({
			logAction: '전광판 제거',
			operatorId: id,
			logType: '전광판 제거',
			logDescription: `전광판 제거 성공: ${ipaddress}`,
			reqIp: ''
		});
		state.billboardConnections.delete(ipaddress);
		state.addedBillboards = state.addedBillboards.filter(board => board !== ipaddress);
	}
};

const updateBillboardStatusInDB = async (ipaddress, status) => {
	try {
		const query = `UPDATE fl_billboard SET linked_status=$1 WHERE billboard_ip=$2`;
		const values = [status, ipaddress];

		const res = await pool.query(query, values);

		if (res && res.rowCount > 0) {
			if (global.websocket) {
				try {
					global.websocket.emit('fl_areaList-update', { areaList: res.rowCount });
					global.websocket.emit('fl_billboards-update', { billboards: res.rowCount });
				} catch (emitError) {
					console.warn(`전광판 상태 업데이트 emit 실패 (${ipaddress}):`, emitError.message);
				}
			} else {
				console.warn(`global.websocket이 설정되지 않거나 연결되지 않음 - 전광판 상태 업데이트 전송 불가 (${ipaddress})`);
			}
		}
		return res.rowCount > 0;
	} catch (error) {
		console.error(`Failed To DB update Billboard (${ipaddress}):`, error);
		return false;
	}
};

let isInitializing = false;
const initializeBillboards = async () => {
	if (isInitializing) {
		logger.info('전광판 초기화 진행 중, 중복 방지');
		return;
	}
	isInitializing = true;
	let client;
	try {
		client = await pool.connect();
		logger.info('데이터베이스 클라이언트 연결 성공');
		const query = `SELECT * FROM fl_billboard`;
		const result = await client.query(query);

		if (result?.rows?.length > 0) {
			logger.info(`${result.rows.length}개의 침수 전광판 초기화 시작`);
			const connectionPromises = result.rows.map(async (billboard) => {
				const ipaddress = billboard.billboard_ip;
				const port = billboard.billboard_port;
				const controllerModel = billboard.billboard_controller_model;

				if (ipaddress && !state.addedBillboards.includes(ipaddress)) {
					logger.info(`[${ipaddress}] 전광판 초기화 연결 시도 - ${controllerModel}`);
					const isConnected = await connectBillboardTcp(ipaddress, port, controllerModel);
					if (isConnected) {
						state.addedBillboards.push(ipaddress);
						logger.info(`[${ipaddress}] 전광판 초기화 성공`);
						return { ip: ipaddress, success: true };
					} else {
						logger.info(`[${ipaddress}] 전광판 초기화 실패`);
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

			logger.info(`침수 전광판 초기화 완료 - 성공: ${successful}개, 실패: ${failed}개, 총 연결: ${state.billboardConnections.size}개`);
		} else {
			logger.info('초기화할 침수 전광판 데이터 없음');
		}
	} catch (error) {
		console.error('침수 전광판 초기화 오류:', error.message);
	} finally {
		if (client) {
			client.release();
		}
		isInitializing = false;
	}
};

const init = async (io) => {
	global.websocket = io;

	state.retryCounts.clear();

	await initializeBillboards();
	io.on('connection', (socket) => {
		logger.info(`Billboard Socket Connected: ${socket.handshake.address}/${socket.id}`);
		socket.on('manageBillboard', (data) => handleBillboardManagement(data));
	});
};

module.exports = {
	init,
	sendToBillboard,
	initializeBillboards,
	sendToGreenParkingBillboard
};