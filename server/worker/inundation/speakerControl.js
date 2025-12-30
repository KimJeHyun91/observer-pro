const { exec } = require('child_process');
const { pool } = require('../../db/postgresqlPool');
const path = require('path');

class SpeakerControlBase {
	static async getSpeakerInfo(ipaddress) {
		const query = `
			SELECT speaker_type, speaker_port, speaker_id, speaker_password 
			FROM fl_speaker 
			WHERE speaker_ip = $1
		`;
		const res = await pool.query(query, [ipaddress]);

		if (!res.rows[0]) {
			throw new Error(`스피커를 찾을 수 없음: ${ipaddress}`);
		}

		return {
			type: res.rows[0].speaker_type || 'axis',
			port: res.rows[0].speaker_port || '80',
			id: res.rows[0].speaker_id || 'root',
			password: res.rows[0].speaker_password || 'root'
		};
	}

	static async matchedSpeakerPort(ipaddress) {
		const info = await this.getSpeakerInfo(ipaddress);
		return info.port;
	}

	static async matchedSpeakerUserInfo(ipaddress) {
		const info = await this.getSpeakerInfo(ipaddress);
		return {
			speakerId: info.id,
			speakerPassword: info.password
		};
	}
}

// AXIS 스피커 전용 클래스
class AxisSpeaker extends SpeakerControlBase {
	static async activateSpeaker(ipaddress, pathUrl, params) {
		const info = await this.getSpeakerInfo(ipaddress);

		if (!ipaddress || !pathUrl) {
			return {
				success: false,
				message: 'Required input value not found',
			};
		}

		const fullUri = `http://${ipaddress}:${info.port}${pathUrl}?${params}`;

		try {
			const result = await new Promise((resolve, reject) => {
				const command = `curl -v --digest -u ${info.id}:${info.password} --max-time 10 "${fullUri}"`;

				exec(command, (error, stdout, stderr) => {
					if (error) {
						console.error(`Axis 스피커 활성화 실패 (${ipaddress}):`, error.message);
						reject(error);
						return;
					}
					console.log(`Axis 스피커 활성화 성공 (${ipaddress}):`, stdout);
					resolve({ stdout, stderr });
				});
			});

			return {
				success: true,
				message: 'Axis speaker activated successfully',
				...result
			};
		} catch (error) {
			console.error(`Axis 스피커 활성화 실패 (${ipaddress}):`, error.message);
			return {
				success: false,
				message: 'Axis speaker activation failed',
				error: error.message
			};
		}
	}

	static async uploadAudioToSpeaker(ipaddress, audioFilePath, fileName) {
		const info = await this.getSpeakerInfo(ipaddress);

		if (!ipaddress || !audioFilePath || !fileName) {
			return {
				success: false,
				message: 'Required input value not found',
			};
		}

		const normalizedPath = audioFilePath.replace(/\\/g, '/');

		try {
			const sanitizedFileName = encodeURIComponent(fileName);
			const command = `curl --fail --verbose --digest -u ${info.id}:${info.password} "http://${ipaddress}:${info.port}/axis-cgi/mediaclip.cgi?action=upload&media=audio&name=${sanitizedFileName}" -H "Expect:" -F "file=@${normalizedPath};filename=${sanitizedFileName};type=audio/wav"`;

			const result = await new Promise((resolve, reject) => {
				exec(command, (error, stdout, stderr) => {
					if (error) {
						console.error('Axis Upload error:', error);
						reject(error);
						return;
					}

					let clipId = null;
					let originalClipId = null;

					if (stdout) {
						if (stdout.includes('uploaded=')) {
							const match = stdout.match(/uploaded=(\d+)/);
							if (match && match[1]) {
								clipId = match[1];
								originalClipId = clipId;
								console.log(`Axis 업로드 성공 (숫자): ${clipId}`);
							}
						}
						else if (stdout.includes('updated=MediaClip')) {
							const match = stdout.match(/updated=MediaClip\.([A-Za-z0-9]+)/);
							if (match && match[1]) {
								originalClipId = `MediaClip.${match[1]}`;

								const numericMatch = match[1].match(/\d+/);
								if (numericMatch) {
									clipId = numericMatch[0];
								} else {
									clipId = match[1];
								}
							}
						}

						if (!clipId) {
							reject(new Error('Axis device did not return a valid clip ID'));
							return;
						}
					} else {
						reject(new Error('No response from Axis device'));
						return;
					}

					resolve({
						stdout,
						stderr,
						clipId,
						originalClipId
					});
				});
			});

			return {
				success: true,
				message: 'Axis audio uploaded successfully',
				clipId: result.clipId,
				originalClipId: result.originalClipId,
				data: result
			};

		} catch (error) {
			console.error('Axis upload failed:', error);
			return {
				success: false,
				message: 'Axis audio upload failed',
				error: error.message || 'Unknown error during upload'
			};
		}
	}

	static async getClipIdByName(ipaddress, userFileName) {
		const info = await this.getSpeakerInfo(ipaddress);

		if (!ipaddress || !userFileName) {
			console.error('Required input values are missing');
			return null;
		}

		const payload = JSON.stringify({
			apiVersion: "0.1",
			method: "getAllMetadata"
		});

		const command = `curl --fail --verbose --digest -u ${info.id}:${info.password} --max-time 10 -X POST -H "Content-Type: application/json" -d "${payload.replace(/"/g, '\\"')}" "http://${ipaddress}:${info.port}/axis-cgi/mediaclip2.cgi"`;

		try {
			const { stdout } = await new Promise((resolve, reject) => {
				exec(command, (error, stdout, stderr) => {
					if (error) {
						reject(new Error(`Metadata fetch failed: ${stderr || error.message}`));
						return;
					}
					resolve({ stdout, stderr });
				});
			});

			if (!stdout || stdout.trim() === '') {
				return null;
			}

			const data = JSON.parse(stdout);
			if (data.error) {
				console.error('Axis API error:', data.error);
				return null;
			}

			if (data.data) {
				for (const clipId in data.data) {
					if (data.data[clipId].name === userFileName || data.data[clipId].fileName === userFileName) {
						console.log(`Axis 클립 발견: "${userFileName}" -> ${clipId}`);
						return clipId;
					}
				}
			}
			return null;
		} catch (error) {
			console.error('Axis metadata 조회 실패:', error);
			return null;
		}
	}
}

// AEPEL 스피커 전용 클래스
class AepelSpeaker extends SpeakerControlBase {
	static async uploadAudio(ipaddress, audioFilePath, fileNo) {
		const info = await this.getSpeakerInfo(ipaddress);
		const normalizedPath = audioFilePath.replace(/\\/g, '/');

		if (!ipaddress || !audioFilePath || !fileNo) {
			return {
				success: false,
				message: 'Required input value not found',
			};
		}

		try {
			const ext = path.extname(audioFilePath).toLowerCase();
			if (ext !== '.mp3' && ext !== '.wav') {
				return {
					success: false,
					message: 'Aepel 스피커는 .mp3 또는 .wav 파일만 지원합니다',
					error: 'Invalid file extension'
				};
			}

			const timestamp = Math.floor(Date.now() / 1000);
			const originalFileName = path.basename(audioFilePath);

			const aepelFileName = `${timestamp}-${originalFileName}`;

			const contentType = ext === '.mp3' ? 'audio/mpeg' : 'audio/wav';

			const command = `curl -X POST -F "username=${info.id}" -F "password=${info.password}" -F "file_no=${fileNo}" -F "file=@${normalizedPath};filename=${aepelFileName};type=${contentType}" http://${ipaddress}:6000/upload`;

			console.log(`Aepel 업로드 시작: 파일번호=${fileNo}, 파일명=${aepelFileName}`);
			console.log(`Aepel 업로드 명령어: ${command}`);

			const result = await new Promise((resolve, reject) => {
				exec(command, (error, stdout, stderr) => {
					if (error) {
						console.error('Aepel upload error:', error);
						reject(error);
						return;
					}

					console.log('Aepel upload raw stdout:', stdout);

					try {
						const response = JSON.parse(stdout);

						if (response.message === 'File uploaded successfully') {
							console.log(`Aepel 업로드 성공: ${response.file_path}`);
							resolve({
								clipId: fileNo.toString(),
								filePath: response.file_path,
								fileName: aepelFileName
							});
						} else {
							reject(new Error(response.message || 'Unknown upload error'));
						}
					} catch (parseError) {
						reject(new Error('Invalid JSON response'));
					}
				});
			});

			return {
				success: true,
				message: 'Aepel audio uploaded successfully',
				clipId: result.clipId,
				filePath: result.filePath,
				fileName: result.fileName
			};

		} catch (error) {
			console.error('Aepel upload failed:', error);
			return {
				success: false,
				message: 'Aepel audio upload failed',
				error: error.message
			};
		}
	}

	static async playAudio(ipaddress, fileNo, repeat = 2) {
		const info = await this.getSpeakerInfo(ipaddress);

		if (!ipaddress || !fileNo) {
			return {
				success: false,
				message: 'Required input value not found',
			};
		}

		try {
			const command = `curl -X GET "http://${ipaddress}:6000/play/${fileNo}/${repeat}?username=${info.id}&password=${info.password}"`;

			console.log(`Aepel 재생 시작 (6000 API): 파일번호=${fileNo}, 반복=${repeat}`);

			const result = await new Promise((resolve, reject) => {
				exec(command, (error, stdout, stderr) => {
					if (error) {
						console.error('Aepel play error:', error);
						reject(error);
						return;
					}

					console.log('Aepel play raw response:', stdout);

					// JSON 응답 확인
					if (stdout.trim().startsWith('{')) {
						try {
							const response = JSON.parse(stdout);
							if (response.message === 'File playing started') {
								console.log(`Aepel 6000 API 재생 성공: 파일번호=${fileNo}`);
								resolve({ message: response.message, format: 'json' });
							} else {
								reject(new Error(response.message || 'Unknown play error'));
							}
							return;
						} catch (parseError) {
							console.error('Aepel play response parse error:', parseError);
						}
					}

					// 응답이 있으면 성공으로 처리
					resolve({
						message: 'Command executed',
						rawResponse: stdout.trim(),
						format: 'unknown'
					});
				});
			});

			return {
				success: true,
				message: 'Aepel audio playing started',
				...result
			};

		} catch (error) {
			console.error('Aepel play failed:', error);
			return {
				success: false,
				message: 'Aepel audio play failed',
				error: error.message
			};
		}
	}

	static async stop(ipaddress) {
		const info = await this.getSpeakerInfo(ipaddress);

		try {
			const command = `curl "${ipaddress}:6000/stop?username=${info.id}&password=${info.password}"`;

			const result = await new Promise((resolve, reject) => {
				exec(command, (error, stdout, stderr) => {
					if (error) {
						reject(error);
						return;
					}

					try {
						// {"message":"Music stopped successfully"}
						const response = JSON.parse(stdout);
						resolve(response);
					} catch (parseError) {
						reject(new Error('Invalid JSON response'));
					}
				});
			});

			return {
				success: true,
				message: 'Aepel audio stopped',
				...result
			};

		} catch (error) {
			return {
				success: false,
				message: 'Aepel stop failed',
				error: error.message
			};
		}
	}

	// 함수 및 관련 로직 구성 완료. Frontend 개발 안됨. 필요 시 해당 함수 로직과 연동하는 화면 단 개발 필요.
	static async setVolume(params) {
		const { ipaddress, level } = params;
		const info = await this.getSpeakerInfo(ipaddress);

		if (level < 0 || level > 100) {
			return {
				success: false,
				message: 'Volume must be between 0 and 100'
			};
		}

		try {
			const command = `curl "${ipaddress}:6000/manage_volume?username=${info.id}&password=${info.password}&volume=${level}"`;

			const result = await new Promise((resolve, reject) => {
				exec(command, (error, stdout, stderr) => {
					if (error) {
						reject(error);
						return;
					}
					resolve({ stdout });
				});
			});

			return {
				success: true,
				message: `Aepel volume set to ${level}%`,
				...result
			};

		} catch (error) {
			return {
				success: false,
				message: 'Aepel volume control failed',
				error: error.message
			};
		}
	}
}

class SpeakerControl extends SpeakerControlBase {
	static async playAepelCGI(ipaddress, fileNo, repeat) {
		const info = await this.getSpeakerInfo(ipaddress);

		try {
			const url = `http://${ipaddress}/cgi-bin/playclip.cgi?id=${info.id}&pwd=${info.password}&location=${fileNo}&repeat=${repeat}`;
			const command = `curl "${url}"`;

			console.log(`Aepel CGI 재생: 파일번호=${fileNo}, 반복=${repeat},`);

			const result = await new Promise((resolve, reject) => {
				exec(command, (error, stdout, stderr) => {
					if (error) {
						reject(error);
						return;
					}

					console.log('Aepel CGI 응답:', stdout.trim());

					if (stdout.includes('.mp3') || stdout.includes('.wav')) {
						resolve({
							message: 'CGI playback started',
							rawResponse: stdout.trim()
						});
					} else {
						resolve({
							message: 'Command executed',
							rawResponse: stdout.trim()
						});
					}
				});
			});

			return {
				success: true,
				message: 'Aepel CGI audio playing',
				...result
			};

		} catch (error) {
			console.error('Aepel CGI play failed:', error);
			return {
				success: false,
				message: 'Aepel CGI play failed',
				error: error.message
			};
		}
	}

	static async uploadAudioToSpeaker(ipaddress, audioFilePath, fileName, fileNo = null) {
		const info = await this.getSpeakerInfo(ipaddress);

		if (info.type === 'aepel') {
			// Aepel은 fileNo 필수
			if (!fileNo) {
				throw new Error('Aepel 스피커는 fileNo가 필요합니다');
			}
			return await AepelSpeaker.uploadAudio(ipaddress, audioFilePath, fileNo);
		} else {
			// Axis는 fileName 사용
			return await AxisSpeaker.uploadAudioToSpeaker(ipaddress, audioFilePath, fileName);
		}
	}

	static async activateSpeaker(ipaddress, pathUrl, params) {
		const info = await this.getSpeakerInfo(ipaddress);

		if (info.type === 'aepel') {
			const locationMatch = params.match(/location=([^&]+)/);
			const repeatMatch = params.match(/repeat=([^&]+)/);
			// const volumeMatch = params.match(/volume=([^&]+)/); 

			if (locationMatch) {
				const fileNo = decodeURIComponent(locationMatch[1]).replace('.mp3', '').replace('.wav', '');
				const repeat = repeatMatch ? parseInt(repeatMatch[1]) : 2;
				// const volume = volumeMatch ? parseInt(volumeMatch[1]) : 25;

				// 숫자면 CGI로 아니면 실패
				if (!isNaN(parseInt(fileNo))) {
					// return await this.playAepelCGI(ipaddress, parseInt(fileNo), repeat, volume);
					return await this.playAepelCGI(ipaddress, parseInt(fileNo), repeat); // 볼륨파라미터 제거 (추후 필요 시 재구성)
				}
			}

			return await SpeakerControl.playAepelCGI(ipaddress, 50, 2, 25);
		} else {
			return await AxisSpeaker.activateSpeaker(ipaddress, pathUrl, params);
		}
	}

	static async getClipIdByName(ipaddress, userFileName) {
		const info = await this.getSpeakerInfo(ipaddress);

		if (info.type === 'aepel') {
			const query = `
				SELECT file_no 
				FROM fl_audio_file_manage 
				WHERE speaker_ip = $1 
				AND message = $2 
				AND speaker_type = 'aepel'
			`;
			const result = await pool.query(query, [ipaddress, userFileName]);
			return result.rows[0]?.file_no?.toString() || null;
		} else {
			return await AxisSpeaker.getClipIdByName(ipaddress, userFileName);
		}
	}

	static async playClip(ipaddress, audioFilePath, userFileName) {
		const info = await this.getSpeakerInfo(ipaddress);

		if (info.type === 'aepel') {
			console.warn('Aepel 스피커는 playClip 대신 직접 playAudio를 사용하세요');
			return {
				success: false,
				message: 'Aepel 스피커는 이 메서드를 지원하지 않습니다'
			};
		} else {
			try {
				const existingClipId = await AxisSpeaker.getClipIdByName(ipaddress, userFileName);

				if (existingClipId) {
					console.log(`Axis 기존 클립 사용: ${existingClipId}`);
					const playResult = await AxisSpeaker.activateSpeaker(
						ipaddress,
						'/axis-cgi/playclip.cgi',
						`clip=${existingClipId}&audiooutput=1&volume=80`
					);

					if (playResult.success) {
						return {
							success: true,
							message: 'Axis 기존 클립으로 재생 성공',
							clipId: existingClipId,
							isNewClip: false,
						};
					}
				}

				console.log(`Axis 새 클립 업로드: ${userFileName}`);
				const uploadResult = await AxisSpeaker.uploadAudioToSpeaker(
					ipaddress,
					audioFilePath,
					userFileName
				);

				if (uploadResult.success && uploadResult.clipId) {
					const playResult = await AxisSpeaker.activateSpeaker(
						ipaddress,
						'/axis-cgi/playclip.cgi',
						`clip=${uploadResult.clipId}&audiooutput=1&volume=80`
					);

					if (playResult.success) {
						return {
							success: true,
							message: 'Axis 새 클립으로 재생 성공',
							clipId: uploadResult.clipId,
							isNewClip: true,
						};
					}
				}

				console.log(`Axis 파일명으로 재생 시도: ${userFileName}`);
				const backupPlayResult = await AxisSpeaker.activateSpeaker(
					ipaddress,
					'/axis-cgi/playclip.cgi',
					`location=${encodeURIComponent(userFileName)}.wav&audiooutput=1&volume=80`
				);

				return {
					success: backupPlayResult.success,
					message: backupPlayResult.success ? 'Axis 파일명으로 재생 성공' : 'Axis 모든 재생 시도 실패',
					isNewClip: !existingClipId,
					...backupPlayResult
				};
			} catch (error) {
				console.error('Axis 클립 재생 에러:', error);
				return {
					success: false,
					message: 'Axis 클립 재생 중 에러',
					error: error.message
				};
			}
		}
	}
}

module.exports = {
	SpeakerControl,
	AxisSpeaker,
	AepelSpeaker,
};
