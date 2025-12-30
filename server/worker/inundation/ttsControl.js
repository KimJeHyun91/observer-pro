const path = require('path');
const { exec } = require('child_process');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

class TTSControl {
	constructor(outputDir) {
		this.outputDir = outputDir;
		this.initDirectory();
	}

	async initDirectory() {
		try {
			await fs.access(this.outputDir);
		} catch (error) {
			try {
				await fs.mkdir(this.outputDir, { recursive: true });
			} catch (mkdirError) {
				console.error('Failed To create directory:', mkdirError);
			}
		}
	}

	async checkSystemSpeech() {
		const testFile = path.join(this.outputDir, 'test_speech.ps1');

		const testScript = `
		[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
		$OutputEncoding = [System.Text.Encoding]::UTF8

		Add-Type -AssemblyName System.Speech
		try {
			$synthesizer = New-Object System.Speech.Synthesis.SpeechSynthesizer
			Write-Output "System.Speech is available"
			$synthesizer.Dispose()
		} catch {
			Write-Error "System.Speech error: $_"
			exit 1
		}
		`;

		try {
			await this.initDirectory();
			await fs.writeFile(testFile, '\ufeff' + testScript, 'utf8');
			const result = await new Promise((resolve, reject) => {
				const command = `powershell -ExecutionPolicy Bypass -NoProfile -NonInteractive -File "${testFile}"`;

				exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
					if (error) {
						console.error('Not generated PowerShell:', error);
						reject(error);
						return;
					}
					resolve(stdout);
				});
			});

			try {
				await fs.unlink(testFile);
			} catch (unlinkError) {
				console.error('Failed remove test files:', unlinkError);
			}

			return result.includes('System.Speech is available');
		} catch (error) {
			console.error('Error in generated PowerShell to System.Speech:', error);

			try {
				await fs.unlink(testFile);
			} catch (unlinkError) {
				console.error('Failed remove test files:', unlinkError);
			}

			return false;
		}
	}

	async checkFFmpeg() {
		try {
			await new Promise((resolve, reject) => {
				exec('ffmpeg -version', (error, stdout) => {
					if (error) {
						reject(error);
						return;
					}
					resolve(stdout);
				});
			});
			return true;
		} catch (error) {
			console.error('FFmpeg not found:', error.message);
			return false;
		}
	}

	async generateTTS(text) {
    await this.initDirectory();

    const fileName = `${text}.wav`;
    const outputFile = path.join(this.outputDir, fileName);
    const scriptFile = path.join(this.outputDir, `${uuidv4()}.ps1`);

    const psScript = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

try {
    Add-Type -AssemblyName System.Speech
    $synthesizer = New-Object System.Speech.Synthesis.SpeechSynthesizer
    
    $outputPath = '${outputFile.replace(/\\/g, '\\\\')}'
    $synthesizer.SetOutputToWaveFile($outputPath)
    
    $text = @"
${text}
"@
    
    $synthesizer.Speak($text)
    
    if (Test-Path $outputPath) {
        Write-Output "SUCCESS"
    } else {
        throw "Failed to generate audio file"
    }
} catch {
    Write-Error $_.Exception.Message
    exit 1
} finally {
    if ($null -ne $synthesizer) {
        $synthesizer.Dispose()
    }
}
`;

    try {
        await fs.writeFile(scriptFile, '\ufeff' + psScript, 'utf8');

        const result = await new Promise((resolve, reject) => {
            const command = `powershell -ExecutionPolicy Bypass -NoProfile -NonInteractive -File "${scriptFile}"`;
            console.log('Executing command:', command);

            exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
                console.log('PowerShell stdout:', stdout);
                console.log('PowerShell stderr:', stderr);

                if (error) {
                    console.error('PowerShell execution error:', error);
                    reject(error);
                    return;
                }
                resolve(stdout);
            });
        });

        const fileStats = await fs.stat(outputFile);

        if (fileStats.size === 0) {
            throw new Error('Checked files size');
        }

        await fs.unlink(scriptFile);

        return {
            success: true,
            filePath: `/tts-output/${fileName}`,
            fullPath: outputFile,
            size: fileStats.size
        };

    } catch (error) {
        try {
            await fs.unlink(scriptFile);
        } catch (unlinkError) {
            console.error('Failed remove test files:', unlinkError);
        }
        return {
            success: false,
            error: error.message
        };
    }
}

	async convertWavToMp3(wavPath) {
		const mp3Path = wavPath.replace('.wav', '.mp3');

		const command = `ffmpeg -i "${wavPath}" -acodec mp3 -ab 128k -ar 44100 -y "${mp3Path}"`;

		console.log(`MP3 변환 시작: ${wavPath} -> ${mp3Path}`);

		try {
			await new Promise((resolve, reject) => {
				exec(command, (error, stdout, stderr) => {
					if (error) {
						console.error('MP3 변환 실패:', error);
						console.error('ffmpeg stderr:', stderr);
						reject(error);
						return;
					}
					console.log('ffmpeg 변환 완료');
					resolve();
				});
			});

			// 변환된 파일 확인
			const stats = await fs.stat(mp3Path);

			try {
				await fs.unlink(wavPath);
				console.log(`원본 WAV 삭제: ${wavPath}`);
			} catch (unlinkError) {
				console.error('WAV 삭제 실패:', unlinkError);
			}

			return mp3Path;
		} catch (error) {
			console.error('MP3 변환 에러:', error);
			throw new Error('MP3 변환 실패 - ffmpeg가 설치되어 있는지 확인하세요');
		}
	}

	async generateTTSAsMp3(text) {
		const hasFFmpeg = await this.checkFFmpeg();
		if (!hasFFmpeg) {
			return {
				success: false,
				error: 'ffmpeg가 설치되어 있지 않습니다. MP3 변환을 위해 ffmpeg를 설치하세요.'
			};
		}

		const wavResult = await this.generateTTS(text);
		if (!wavResult.success) {
			return wavResult;
		}

		try {
			const mp3Path = await this.convertWavToMp3(wavResult.fullPath);

			return {
				success: true,
				filePath: `/tts-output/${path.basename(mp3Path)}`,
				fullPath: mp3Path,
				size: (await fs.stat(mp3Path)).size
			};
		} catch (error) {
			return {
				success: false,
				error: error.message
			};
		}
	}
}

module.exports = TTSControl;