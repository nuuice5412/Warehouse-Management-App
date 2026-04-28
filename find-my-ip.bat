@echo off
color 0A
echo =======================================================
echo          YOUR LOCAL IP ADDRESS (SERVER IP)
echo =======================================================
echo.
echo Your IP Address is:
for /f "tokens=14" %%a in ('ipconfig ^| findstr IPv4') do echo %%a
echo.
echo =======================================================
echo Please use this IP combined with port 4000.
echo Example: http://192.168.1.xxx:4000
echo.
echo Enter this URL in the "Backend URL" field on all
echo other computers in the same network.
echo =======================================================
echo.
pause
