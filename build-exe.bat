@echo off
rem Builds the portable AzerothIdle-x.y.z.exe into the "release" folder (runs on any Windows, no Node.js needed to play).
cd /d "%~dp0"
call npm.cmd install
if errorlevel 1 goto err
call npm.cmd run dist
if errorlevel 1 goto err
echo.
echo Done: the exe is in the "release" folder.
explorer release
pause
exit /b 0
:err
echo Something went wrong - copy the message above.
pause
