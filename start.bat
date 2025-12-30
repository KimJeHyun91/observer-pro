@echo off
@REM cd /d "%~dp0"

@REM echo === 서버 실행 ===
@REM start "" observer-server.exe

@REM echo === 클라이언트 실행 (정적 build) ===
@REM start "" cmd /k "npx serve -s build -l 5173"

@REM :: 브라우저 자동 실행
@REM timeout /t 2 > nul
@REM start "" "http://localhost:5173"





@REM @echo off
cd /d "%~dp0"
start "" /min observer-server.exe
timeout /t 2 > nul
start "" "http://localhost:4200"
