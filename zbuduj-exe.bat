@echo off
rem Buduje przenosny plik AzerothIdle-x.y.z.exe w folderze release (dziala na kazdym Windowsie, bez instalacji Node).
cd /d "%~dp0"
call npm.cmd install
if errorlevel 1 goto err
call npm.cmd run dist
if errorlevel 1 goto err
echo.
echo Gotowe: plik exe jest w folderze release
explorer release
pause
exit /b 0
:err
echo Cos poszlo nie tak - skopiuj komunikat powyzej.
pause
