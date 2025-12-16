@echo off
if "%1"=="hidden" goto :hidden
start /min "" "%~f0" hidden
exit
:hidden
cd /d "%~dp0"
npm start
