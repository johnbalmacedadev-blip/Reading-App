@echo off
setlocal enabledelayedexpansion

set ROOT=%~dp0..
set TPL=%~dp0deploy-templates
set STAGE=%ROOT%\dist\lecturescientifique.ca
set ARCHIVE=%ROOT%\lecturescientifique-deploy.tar.gz

echo Building single-folder deploy archive...

if exist "%ROOT%\dist" rmdir /s /q "%ROOT%\dist"
mkdir "%STAGE%"
mkdir "%STAGE%\laravel"

rem --- Laravel application internals -> laravel/ (public excluded; copied separately) ---
robocopy "%ROOT%\backend" "%STAGE%\laravel" /E /XD node_modules .git public tests /XF .env .env.* *.log cookies.txt test-cookies.txt routes-v7.php *.sqlite /NFL /NDL /NJH /NJS /nc /ns /np
if %ERRORLEVEL% GEQ 8 exit /b %ERRORLEVEL%

rem --- Public web files -> document root (top of the folder) ---
robocopy "%ROOT%\backend\public" "%STAGE%" /E /NFL /NDL /NJH /NJS /nc /ns /np
if %ERRORLEVEL% GEQ 8 exit /b %ERRORLEVEL%

rem --- Overlay the single-folder templated files ---
copy /Y "%TPL%\index.php" "%STAGE%\index.php" >nul
copy /Y "%TPL%\deploy-setup.php" "%STAGE%\deploy-setup.php" >nul
copy /Y "%TPL%\env" "%STAGE%\laravel\.env" >nul
copy /Y "%TPL%\laravel.htaccess" "%STAGE%\laravel\.htaccess" >nul
copy /Y "%TPL%\INSTALL.txt" "%STAGE%\INSTALL.txt" >nul
if exist "%ROOT%\DEPLOY.md" copy /Y "%ROOT%\DEPLOY.md" "%STAGE%\DEPLOY.md" >nul

if exist "%ARCHIVE%" del /f "%ARCHIVE%"

cd /d "%ROOT%\dist"
tar -czf "%ARCHIVE%" lecturescientifique.ca

echo.
echo Created: %ARCHIVE%
for %%A in ("%ARCHIVE%") do echo Size: %%~zA bytes

endlocal
