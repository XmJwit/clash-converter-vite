@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"

echo ============================================================
echo   Proxy ^<-^> Clash 双向转换器 (Vite + React)
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 20 或更高版本：
    echo        https://nodejs.org/
    pause
    exit /b 1
)

for /f "delims=" %%v in ('node -v') do set NODE_VERSION=%%v
echo [1/4] Node.js 版本: %NODE_VERSION%

if not exist "node_modules" (
    echo [2/4] 首次运行，正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo [2/4] 依赖已存在，跳过安装
)

if not exist "dist\index.html" (
    echo [3/4] 正在构建前端...
    call npm run build
    if errorlevel 1 (
        echo [错误] 构建失败
        pause
        exit /b 1
    )
) else (
    echo [3/4] 检测到构建产物，跳过构建
)

if "%PORT%"=="" set PORT=8787

if "%ENCRYPTION_KEY%"=="" (
    echo [4/4] 未设置 ENCRYPTION_KEY，本次运行将使用临时密钥
    echo        ^(重启后旧订阅链接会失效，建议设置后重启^)
) else (
    echo [4/4] 已使用自定义 ENCRYPTION_KEY
)

echo.
echo 服务地址: http://127.0.0.1:%PORT%
echo 关闭此窗口即可停止服务
echo.

call npm start

pause
