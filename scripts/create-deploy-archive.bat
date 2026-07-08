@echo off
setlocal enabledelayedexpansion

set ROOT=%~dp0..
set STAGE=%ROOT%\dist\lecture-portal
set ARCHIVE=%ROOT%\lecture-portal-deploy.tar.gz

echo Building deploy archive...

if exist "%ROOT%\dist" rmdir /s /q "%ROOT%\dist"
mkdir "%STAGE%"
mkdir "%STAGE%\backend"

robocopy "%ROOT%\backend" "%STAGE%\backend" /E /XD node_modules .git public\spa tests /XF .env .env.* *.log cookies.txt test-cookies.txt /NFL /NDL /NJH /NJS /nc /ns /np
if %ERRORLEVEL% GEQ 8 exit /b %ERRORLEVEL%

copy /Y "%ROOT%\DEPLOY.md" "%STAGE%\DEPLOY.md" >nul
copy /Y "%ROOT%\backend\.env.production.example" "%STAGE%\backend\.env.production.example" >nul

(
echo Lecture Portal - cPanel install ^(NO SSH / NO TERMINAL NEEDED^)
echo ============================================================
echo.
echo 1. In cPanel File Manager, upload this .tar.gz to your home folder
echo    ^(e.g. /home/youruser/^), then right-click it and choose Extract.
echo    You now have: /home/youruser/lecture-portal/backend/...
echo.
echo 2. Create the database in cPanel:
echo    - MySQL Databases: create a database + a user, add the user to
echo      the database with ALL PRIVILEGES. Note the names + password.
echo.
echo 3. Create backend/.env:
echo    - In File Manager, open lecture-portal/backend
echo    - Copy .env.production.example to .env ^(right-click ^> Copy, rename^)
echo    - Edit .env: set DB_DATABASE, DB_USERNAME, DB_PASSWORD,
echo      APP_URL, SESSION_DOMAIN, SANCTUM_STATEFUL_DOMAINS to your domain.
echo    - APP_KEY is already filled in, so you do NOT need key:generate.
echo.
echo 4. Point your domain document root to:
echo    /home/youruser/lecture-portal/backend/public
echo    ^(cPanel ^> Domains ^> your domain ^> Document Root^)
echo.
echo 5. Run the one-time web installer in your browser:
echo    https://yourdomain.com/deploy-setup.php?token=9a9a85e19b814b078eca5b94f27dad02
echo    Add ^&seed=1 to also load demo data
echo    ^(teacher login: gisele@example.com / password^).
echo    Example: https://yourdomain.com/deploy-setup.php?token=9a9a85e19b814b078eca5b94f27dad02^&seed=1
echo.
echo 6. When it prints "Done", DELETE deploy-setup.php from the server.
echo.
echo 7. Set folder permissions to 755 ^(dirs^) via File Manager if needed:
echo    lecture-portal/backend/storage  and  bootstrap/cache
echo.
echo See DEPLOY.md for full details and troubleshooting.
) > "%STAGE%\INSTALL.txt"

if exist "%ARCHIVE%" del /f "%ARCHIVE%"

cd /d "%ROOT%\dist"
tar -czf "%ARCHIVE%" lecture-portal

echo.
echo Created: %ARCHIVE%
for %%A in ("%ARCHIVE%") do echo Size: %%~zA bytes

endlocal
