@echo off
chcp 65001 >nul
echo ========================================
echo    zero-moyu Plugin Build Script
echo ========================================

REM Create plugin directory
if not exist "plugin" mkdir plugin
echo Creating plugin directory...

REM Clean plugin directory
echo Cleaning plugin directory...
if exist "plugin\*" del /q "plugin\*"

REM Build VS Code plugin
echo.
echo Building VS Code plugin...
cd vscode
call vsce package --allow-missing-repository
if %errorlevel% neq 0 (
    echo VS Code plugin build failed!
    pause
    exit /b 1
)
echo VS Code plugin build completed!

REM Copy VS Code plugin to plugin directory
echo Copying VS Code plugin to plugin directory...
copy "*.vsix" "..\plugin\"
cd ..

REM Build IntelliJ IDEA plugin
echo.
echo Building IntelliJ IDEA plugin...
cd idea
call gradle clean buildPlugin
if %errorlevel% neq 0 (
    echo IntelliJ IDEA plugin build failed!
    pause
    exit /b 1
)
echo IntelliJ IDEA plugin build completed!

REM Copy IDEA plugin to plugin directory
echo Copying IDEA plugin to plugin directory...
copy "build\distributions\*.zip" "..\plugin\"
cd ..

REM Show results
echo.
echo ========================================
echo           Build Completed!
echo ========================================
echo Plugin files saved to plugin directory:
dir plugin
echo.
pause