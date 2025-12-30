const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const speakerMapper = require('../mappers/speakerMapper');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);


exports.getSpeakerList = async () => {

  const client = await pool.connect();

  try {

    let binds = [];

    let query = await speakerMapper.getSpeakerList();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('villageBroadcast/speakerService.js, getSpeakerList, error: ', error);
    console.log('villageBroadcast/speakerService.js, getSpeakerList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.deleteSpeaker = async ({ idx }) => {

  const client = await pool.connect();

  try {

    const speakerIdx = idx;

    await client.query('BEGIN');
    let binds = [speakerIdx];
    let query = await speakerMapper.deleteSpeaker();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if((global.websocket) && (res) && (res.rowCount > 0)) {
      global.websocket.emit("vb_speakers-update", { speakerList: {'delete':res.rowCount} });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('villageBroadcast/speakerService.js, deleteSpeaker, error: ', error);
    console.log('villageBroadcast/speakerService.js, deleteSpeaker, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}


exports.addSpeakerMacro = async ({ speakerMsg }) => {

    const client = await pool.connect();

    try {

        // const ttsFilePath = path.join(__dirname, "../../../public", "files", "vb_tts");
        // await fs.mkdir(ttsFilePath, { recursive: true });
        const ttsFilePath = path.join(process.cwd(), 'public', 'files', 'vb_tts');
        await fs.mkdir(ttsFilePath, { recursive: true });

        const timestamp = Date.now();
        const outputFilePath = path.join(ttsFilePath, `${timestamp}.wav`); 
        const scriptFilePath = path.join(ttsFilePath, `${timestamp}.ps1`); 

        const safeSpeakerMsg = speakerMsg
            .replace(/"/g, '""') 
            .replace(/\r?\n/g, "`r`n"); 

            const psScript = [
              '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
              '$OutputEncoding = [System.Text.Encoding]::UTF8',
              '',
              'try {',
              '    Add-Type -AssemblyName System.Speech',
              '    $synthesizer = New-Object System.Speech.Synthesis.SpeechSynthesizer',
              '',
              '    $voices = $synthesizer.GetInstalledVoices() | Select-Object -ExpandProperty VoiceInfo | Select-Object -ExpandProperty Name',
              '    $preferredVoices = @("Microsoft Heami Desktop", "Microsoft David Desktop", "Microsoft Zira Desktop")',
              '    $selectedVoice = $preferredVoices | Where-Object { $voices -contains $_ } | Select-Object -First 1',
              '',
              '    if ($selectedVoice) {',
              '        $synthesizer.SelectVoice($selectedVoice)',
              '    } else {',
              '        Write-Output "사용할 수 있는 TTS 음성이 없습니다. 기본 음성을 사용합니다."',
              '    }',
              '',
              `    $outputPath = '${outputFilePath.replace(/\\/g, '\\\\')}'`,
              '    $synthesizer.SetOutputToWaveFile($outputPath)',
              '',
              '    $text = @"',
              `${safeSpeakerMsg}`,
              '"@',
              '',
              '    $synthesizer.Speak($text)',
              '',
              '    if (Test-Path $outputPath) {',
              '        Write-Output "SUCCESS"',
              '    } else {',
              '        throw "Failed to generate audio file"',
              '    }',
              '} catch {',
              '    Write-Error $_.Exception.Message',
              '    exit 1',
              '} finally {',
              '    if ($null -ne $synthesizer) {',
              '        $synthesizer.Dispose()',
              '    }',
              '}',
          ].join('\r\n');
          

        await fs.writeFile(scriptFilePath, '\ufeff' + psScript, 'utf8');

        const command = `powershell -ExecutionPolicy Bypass -NoProfile -NonInteractive -File "${scriptFilePath}"`;

        try {
            const { stdout, stderr } = await execPromise(command);
            console.log('PowerShell stdout:', stdout);

            if (stderr) {
                console.error('PowerShell stderr:', stderr);
            }
        } catch (error) {
            logger.error('PowerShell execution error:', error);
            console.error('PowerShell execution error:', error);

            await client.query('ROLLBACK');
            throw error;
        } finally {
            try {
                await fs.unlink(scriptFilePath);
            } catch (unlinkError) {
                console.error('Failed to delete script file:', unlinkError);
            }
        }

        let binds = [speakerMsg, `${timestamp}.wav`];

        await client.query('BEGIN');
        let query = await speakerMapper.addSpeakerMacro();
        const res = await client.query(query, binds);
        await client.query('COMMIT');

        if ((global.websocket) && (res) && (res.rows) && (res.rows.length > 0)) {
            global.websocket.emit("vb_speakers-update", { speakerList: { 'add': res.rows.length } });
        }

        return res.rows;
    } catch (error) {
        logger.info('villageBroadcast/speakerService.js, addSpeakerMacro, error: ', error);
        console.log('villageBroadcast/speakerService.js, addSpeakerMacro, error: ', error);
        await client.query('ROLLBACK');
    } finally {
        await client.release();
    }
};





exports.modifySpeakerMacro = async ({ idx, speakerMsg }) => {

  const client = await pool.connect();

  try {

    const speakerIdx = idx;

    await client.query('BEGIN');
    let binds = [speakerIdx, speakerMsg];
    let query = await speakerMapper.modifySpeakerMacro();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if((global.websocket) && (res) && (res.rowCount > 0)) {
      global.websocket.emit("vb_speakers-update", { speakerList: {'update':res.rowCount} });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('villageBroadcast/speakerService.js, modifySpeakerMacro, error: ', error);
    console.log('villageBroadcast/speakerService.js, modifySpeakerMacro, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.getSpeakerMacroList = async () => {

  const client = await pool.connect();

  try {

    let binds = [];
    let query = await speakerMapper.getSpeakerMacroList();
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('villageBroadcast/speakerService.js, getSpeakerMacroList, error: ', error);
    console.log('villageBroadcast/speakerService.js, getSpeakerMacroList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.deleteSpeakerMacro = async ({ idx }) => {

  const client = await pool.connect();

  try {

    const speakerIdx = idx;

    await client.query('BEGIN');
    let binds = [speakerIdx];
    let query = await speakerMapper.deleteSpeakerMacro();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if((global.websocket) && (res) && (res.rowCount > 0)) {
      global.websocket.emit("vb_speakers-update", { speakerList: {'delete':res.rowCount} });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('villageBroadcast/speakerService.js, deleteSpeakerMacro, error: ', error);
    console.log('villageBroadcast/speakerService.js, deleteSpeakerMacro, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.getSpeakerStatusCount = async () => {

  const client = await pool.connect();

  try {

    let binds = [];

    let query = await speakerMapper.getSpeakerStatusCount();

    const res = await client.query(query, binds);

    if((global.websocket) && (res) && (res.rowCount > 0)) {
      global.websocket.emit("vb_speaker-update", { speakerList: { 'update': res.rowCount } });
    }

    return res.rows;

  } catch (error) {
    logger.info('villageBroadcast/speakerService.js, getSpeakerStatusCount, error: ', error);
    console.log('villageBroadcast/speakerService.js, getSpeakerStatusCount, error: ', error);
  } finally {
    await client.release();
  }
}