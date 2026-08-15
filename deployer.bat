@echo off
REM ===== Deploiement Paylika en un double-clic =====
REM Va dans le dossier du projet (celui de ce fichier)
cd /d "%~dp0"

echo.
echo ============================================
echo   Deploiement de Paylika en cours...
echo   (la 1re fois, une page Cloudflare s'ouvre
echo    dans ton navigateur : clique sur "Allow")
echo ============================================
echo.

call npm run deploy

echo.
echo ============================================
echo   Termine. Ton lien en ligne est affiche
echo   juste au-dessus (adresse https://...).
echo ============================================
echo.
pause
