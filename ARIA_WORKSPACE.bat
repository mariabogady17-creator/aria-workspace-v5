@echo off
setlocal enabledelayedexpansion
title A.R.I.A Workspace Launcher
color 0B
cd /d "%~dp0"

echo ===================================================
echo       A.R.I.A. Workspace - Local Environment       
echo ===================================================

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js no esta instalado o no esta en el PATH.
    echo Por favor, descarga e instala Node.js desde https://nodejs.org/
    pause
    exit /b 1
)

:: Check version
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo [OK] Node.js detectado: %NODE_VER%

:: Estamos dentro de a.r.i.a.-workspace, no necesitamos hacer cd.
:: Verificamos que este sea el directorio correcto buscando el package.json
if not exist "package.json" (
    echo [ERROR] package.json no encontrado. Asegurate de ejecutar el script desde el directorio correcto.
    pause
    exit /b 1
)

:: Check for node_modules
if not exist "node_modules\" (
    echo [INFO] Instalando dependencias - npm install -...
    call npm install
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Fallo al instalar dependencias.
        pause
        exit /b 1
    )
) else (
    echo [OK] Dependencias instaladas.
)

:: Check .env
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Creando archivo .env desde .env.example
        copy .env.example .env
    ) else (
        echo [INFO] Creando archivo .env base
        echo ARIA_PORT=3000 > .env
    )
)

:: Check AI Models (Ahora es opcional desde la interfaz de Ajustes del navegador)
:: if not exist "public\models\Xenova\whisper-tiny" (
::     echo [INFO] Descargando Modelos de IA Offline ^(Primera ejecucion^)...
::     call npm run download-models
:: ) else (
::     echo [OK] Modelos de IA Offline detectados.
:: )

echo [INFO] Iniciando A.R.I.A. Workspace (npm run dev)...
echo ===================================================
call npm run dev
pause
