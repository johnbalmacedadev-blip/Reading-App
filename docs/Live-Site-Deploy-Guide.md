# Live Site Deploy Guide

Companion markdown for `Live-Site-Deploy-Guide.pdf`.  
Regenerate the PDF with:

```bash
python scripts/generate-live-deploy-pdf.py
```

## Summary

| Item | Value |
|------|--------|
| Live URL | https://lecturescientifique.ca |
| SSH host | 146.190.248.212 |
| SSH user | root |
| App path | `/var/www/lecture-scientifique/backend` |
| Method | SSH/SFTP (Paramiko) lean code archive |

**Do not commit the server password.** Use `LECTURE_DEPLOY_PASSWORD` (or a password manager).

## Steps

1. Test changes locally.
2. `cd "Teacher Dashboard" && npm run build:deploy`
3. Package lean backend paths (exclude `.env`, `storage/`, `node_modules/`).
4. SSH/SFTP to the VPS; backup live `.env` + `storage/`.
5. Upload + extract archive; restore `.env` + `storage/`.
6. On server:
   ```bash
   cd /var/www/lecture-scientifique/backend
   php artisan migrate --force
   php artisan route:clear && php artisan config:clear && php artisan cache:clear
   php artisan config:cache
   rm -f bootstrap/cache/routes*.php
   ```
7. Optional workshops sync:
   ```bash
   php artisan assessments:sync-platform-workshops --replace
   ```
8. Verify site; hard-refresh browser; remove temp scripts/`/tmp` archives.
