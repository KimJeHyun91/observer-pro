@echo off
SET PGPASSWORD=admin1234
chcp 65001 >nul

REM PostgreSQL path 자동 등록
WHERE psql >nul 2>nul
IF ERRORLEVEL 1 (
    SET FOUND_PG_BIN=
    FOR /D %%D IN ("C:\Program Files\PostgreSQL\*") DO (
        IF EXIST "%%D\bin\psql.exe" (
            SET "FOUND_PG_BIN=%%D\bin"
            GOTO :FOUND
        )
    )
    :FOUND
    IF DEFINED FOUND_PG_BIN (
        SET "PATH=%PATH%;%FOUND_PG_BIN%"
    ) ELSE (
        echo PostgreSQL 경로를 찾을 수 없습니다.
        pause
        EXIT /B 1
    )
)

echo [INFO] 연결된 세션 종료 중...
psql -U postgres -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'gisdb' AND pid <> pg_backend_pid();"

echo [INFO] gisdb 데이터베이스 복원 시작...
pg_restore -U postgres -d postgres --clean --create -v "%~dp0gisdb.dump"

IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] 복원 실패!
    pause
    EXIT /B 1
)

echo [SUCCESS] gisdb 복원이 완료되었습니다!
pause
