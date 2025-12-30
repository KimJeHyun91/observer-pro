@echo off
echo ObserverPro NSSM 자동 재시작 설정 스크립트
echo ================================================

REM 관리자 권한 확인
net session >nul 2>&1
if %errorLevel% == 0 (
    echo 관리자 권한 확인됨
) else (
    echo 이 스크립트는 관리자 권한이 필요합니다.
    echo 관리자 권한으로 다시 실행해주세요.
    pause
    exit /b 1
)

echo.
echo 1. ObserverServer 자동 재시작 설정 중...
echo.

REM ObserverServer 서비스 중지
echo ObserverServer 서비스 중지 중...
nssm stop ObserverServer
if %errorLevel% == 0 (
    echo ObserverServer 서비스 중지 완료
) else (
    echo ObserverServer 서비스가 이미 중지되어 있거나 존재하지 않습니다.
)

REM ObserverServer 자동 재시작 설정
echo ObserverServer 자동 재시작 설정 중...
nssm set ObserverServer AppRestartDelay 10000
nssm set ObserverServer AppStopMethodSkip 0
nssm set ObserverServer AppStopMethodConsole 1500
nssm set ObserverServer AppStopMethodWindow 1500
nssm set ObserverServer AppStopMethodThreads 1500
nssm set ObserverServer AppExit Default Restart

REM Windows 서비스 복구 옵션 설정
echo Windows 서비스 복구 옵션 설정 중...
sc failure ObserverServer reset= 86400 actions= restart/60000/restart/60000/restart/60000

echo ObserverServer 설정 완료!

echo.
echo 2. GeoServer 자동 재시작 설정 중...
echo.

REM GeoServer 서비스 중지
echo GeoServer 서비스 중지 중...
nssm stop GeoServer
if %errorLevel% == 0 (
    echo GeoServer 서비스 중지 완료
) else (
    echo GeoServer 서비스가 이미 중지되어 있거나 존재하지 않습니다.
)

REM GeoServer 자동 재시작 설정
echo GeoServer 자동 재시작 설정 중...
nssm set GeoServer AppRestartDelay 10000
nssm set GeoServer AppStopMethodSkip 0
nssm set GeoServer AppStopMethodConsole 1500
nssm set GeoServer AppStopMethodWindow 1500
nssm set GeoServer AppStopMethodThreads 1500
nssm set GeoServer AppExit Default Restart

REM Windows 서비스 복구 옵션 설정
echo Windows 서비스 복구 옵션 설정 중...
sc failure GeoServer reset= 86400 actions= restart/60000/restart/60000/restart/60000

echo GeoServer 설정 완료!

echo.
echo 3. 서비스 시작 중...
echo.

REM ObserverServer 시작
echo ObserverServer 시작 중...
nssm start ObserverServer
if %errorLevel% == 0 (
    echo ObserverServer 시작 완료
) else (
    echo ObserverServer 시작 실패
)

REM GeoServer 시작
echo GeoServer 시작 중...
nssm start GeoServer
if %errorLevel% == 0 (
    echo GeoServer 시작 완료
) else (
    echo GeoServer 시작 실패
)

echo.
echo 4. 설정 확인 중...
echo.

REM ObserverServer 설정 확인
echo ObserverServer 설정:
nssm dump ObserverServer | findstr "AppRestartDelay\|AppStopMethod"

REM GeoServer 설정 확인
echo.
echo GeoServer 설정:
nssm dump GeoServer | findstr "AppRestartDelay\|AppStopMethod"

REM 서비스 복구 옵션 확인
echo.
echo ObserverServer 복구 옵션:
sc qfailure ObserverServer

echo.
echo GeoServer 복구 옵션:
sc qfailure GeoServer

echo.
echo ================================================
echo NSSM 자동 재시작 설정 완료
echo.
echo 설정된 내용:
echo - AppRestartDelay: 10초 후 자동 재시작
echo - AppStopMethod: 1.5초 후 강제 종료
echo - Windows 서비스 복구: 3회 재시작 시도 (1분 간격)
echo.
echo 
echo.
pause 