#!/usr/bin/env python3
"""Generate docs/Live-Site-Deploy-Guide.pdf - how we connect and deploy to production."""
from pathlib import Path

from fpdf import FPDF

OUT = Path(__file__).resolve().parents[1] / "docs" / "Live-Site-Deploy-Guide.pdf"


class GuidePDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(100, 116, 139)
        self.cell(0, 8, "Lecture Scientifique - Live Site Deploy Guide", align="L")
        self.ln(12)

    def footer(self):
        self.set_y(-14)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(148, 163, 184)
        self.cell(0, 8, f"Page {self.page_no()}/{{nb}}", align="C")

    def h1(self, text):
        self.set_font("Helvetica", "B", 20)
        self.set_text_color(10, 22, 40)
        self.multi_cell(0, 10, text)
        self.ln(2)

    def h2(self, text):
        self.ln(3)
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(0, 74, 173)
        self.multi_cell(0, 8, text)
        self.ln(1)

    def h3(self, text):
        self.ln(2)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(30, 41, 59)
        self.multi_cell(0, 7, text)
        self.ln(1)

    def body(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(51, 65, 85)
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def bullet(self, text):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(51, 65, 85)
        self.multi_cell(0, 5.5, f"  - {text}")
        self.ln(0.5)

    def step(self, number, title, body):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(0, 74, 173)
        self.multi_cell(0, 7, f"Step {number}: {title}")
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(51, 65, 85)
        self.multi_cell(0, 5.5, body)
        self.ln(2)

    def code(self, text):
        self.set_x(self.l_margin)
        self.set_fill_color(241, 245, 249)
        self.set_font("Courier", "", 8.5)
        self.set_text_color(15, 23, 42)
        self.multi_cell(0, 4.5, text, fill=True)
        self.ln(2)

    def warn(self, text):
        self.set_x(self.l_margin)
        self.set_fill_color(255, 247, 237)
        self.set_font("Helvetica", "", 9.5)
        self.set_text_color(154, 52, 18)
        self.multi_cell(0, 5.5, f"Security: {text}", fill=True)
        self.ln(2)

    def table_row(self, left, right, header=False):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "B" if header else "", 9.5)
        if header:
            self.set_text_color(15, 23, 42)
            self.set_fill_color(226, 232, 240)
        else:
            self.set_text_color(51, 65, 85)
            self.set_fill_color(248, 250, 252)
        w1, w2 = 55, self.epw - 55
        self.cell(w1, 8, f" {left}", border=1, fill=True)
        self.cell(w2, 8, f" {right}", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")


def build():
    pdf = GuidePDF(format="Letter")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(18, 18, 18)
    pdf.add_page()

    pdf.h1("Live Site Deploy Guide")
    pdf.body(
        "Lecture Scientifique / Lecture Portal - how we connect to production and "
        "push updates from a local Windows development machine."
    )
    pdf.body("Document date: August 2026")

    pdf.h2("1. Overview")
    pdf.body(
        "Production is not updated by uploading a cPanel archive manually for day-to-day "
        "changes. The working process used in this project is:"
    )
    pdf.bullet("Build the React SPA locally into the Laravel public folder.")
    pdf.bullet("Connect over SSH/SFTP to the DigitalOcean VPS.")
    pdf.bullet("Upload a lean code archive (app + SPA assets), preserving live .env and storage.")
    pdf.bullet("Run Artisan migrate / cache / optional workshop sync on the server.")
    pdf.body(
        "The live site URL is https://lecturescientifique.ca. The application root on the "
        "server is /var/www/lecture-scientifique/backend (document root serves backend/public)."
    )

    pdf.h2("2. Connection details")
    pdf.table_row("Item", "Value", header=True)
    pdf.table_row("Protocol", "SSH + SFTP (Paramiko from Windows)")
    pdf.table_row("Host / IP", "146.190.248.212")
    pdf.table_row("SSH user", "root")
    pdf.table_row("App path", "/var/www/lecture-scientifique/backend")
    pdf.table_row("Public URL", "https://lecturescientifique.ca")
    pdf.table_row("Web server", "Nginx (+ PHP-FPM)")
    pdf.ln(3)
    pdf.warn(
        "Do not commit the server password into git, PDFs that are shared publicly, or chat logs. "
        "Store the root password in a password manager. Scripts used for deploy should read the "
        "password from an environment variable (e.g. LECTURE_DEPLOY_PASSWORD) or a local ignored file."
    )

    pdf.h2("3. Prerequisites on your PC")
    pdf.bullet("Project checked out locally (e.g. C:\\xampp\\htdocs\\Lecture Portal).")
    pdf.bullet("Node.js 18+ for the Teacher Dashboard Vite build.")
    pdf.bullet("PHP + Composer available if you refresh vendor locally.")
    pdf.bullet("Python 3 with the paramiko package (pip install paramiko).")
    pdf.bullet("Network access to the VPS on port 22.")

    pdf.h2("4. Step-by-step deploy process")

    pdf.step(
        1,
        "Make and test your changes locally",
        "Develop against local XAMPP / Vite (http://localhost:5173 with API proxy to the Laravel "
        "backend). Confirm workshops, admin UI, and APIs work before shipping.",
    )

    pdf.step(
        2,
        "Build the production SPA",
        "From the Teacher Dashboard folder, run the deploy build. This writes app.html and the "
        "hashed assets into backend/public/ (via Vite outDir + scripts/copy-spa-build.mjs).",
    )
    pdf.code(
        'cd "Teacher Dashboard"\n'
        "npm install          # first time only\n"
        "npm run build:deploy"
    )
    pdf.body("Verify these exist before uploading:")
    pdf.bullet("backend/public/app.html")
    pdf.bullet("backend/public/assets/ (JS/CSS/images)")
    pdf.bullet("backend/vendor/autoload.php (for full deploys that include vendor)")

    pdf.step(
        3,
        "Prepare a lean deploy package",
        "Package only what should overwrite production. Typical include list:",
    )
    pdf.bullet("app/, bootstrap/, config/, database/, lang/, resources/, routes/")
    pdf.bullet("public/ (especially app.html + assets/) - exclude public/storage media")
    pdf.bullet("vendor/, artisan, composer.json, composer.lock (when dependencies changed)")
    pdf.body("Always exclude:")
    pdf.bullet(".env and .env.* (never overwrite production secrets)")
    pdf.bullet("storage/ (uploads, logs, framework cache - keep server copy)")
    pdf.bullet("node_modules/, .git/, tests/, public/spa/")

    pdf.step(
        4,
        "Connect with SSH/SFTP",
        "From a temporary Python deploy script (or any SSH client), connect to the host as root "
        "using Paramiko. Example pattern:",
    )
    pdf.code(
        "import paramiko\n"
        "client = paramiko.SSHClient()\n"
        "client.set_missing_host_key_policy(paramiko.AutoAddPolicy())\n"
        "client.connect(\n"
        '    "146.190.248.212",\n'
        '    username="root",\n'
        '    password=os.environ["LECTURE_DEPLOY_PASSWORD"],\n'
        "    timeout=30,\n"
        "    allow_agent=False,\n"
        "    look_for_keys=False,\n"
        ")"
    )

    pdf.step(
        5,
        "Backup live .env and storage, then upload",
        "On the server, copy .env and storage aside. Upload the tar.gz over SFTP to /tmp, "
        "extract into the app directory, then restore .env and storage.",
    )
    pdf.code(
        "# On server (via SSH)\n"
        "cp /var/www/lecture-scientifique/backend/.env /tmp/lecture.env.bak\n"
        "cp -a /var/www/lecture-scientifique/backend/storage /tmp/lecture-storage-bak\n"
        "\n"
        "# After SFTP upload of archive to /tmp/lecture-code-update.tar.gz\n"
        "tar -xzf /tmp/lecture-code-update.tar.gz -C /var/www/lecture-scientifique/backend\n"
        "cp /tmp/lecture.env.bak /var/www/lecture-scientifique/backend/.env\n"
        "cp -a /tmp/lecture-storage-bak/. /var/www/lecture-scientifique/backend/storage/\n"
        "chown -R www-data:www-data storage bootstrap/cache"
    )

    pdf.step(
        6,
        "Run migrations and clear caches",
        "Execute Artisan from the backend directory on the server:",
    )
    pdf.code(
        "cd /var/www/lecture-scientifique/backend\n"
        "php artisan migrate --force\n"
        "php artisan storage:link || true\n"
        "php artisan route:clear\n"
        "php artisan config:clear\n"
        "php artisan cache:clear\n"
        "php artisan view:clear\n"
        "php artisan config:cache\n"
        "rm -f bootstrap/cache/routes*.php"
    )
    pdf.body(
        "Removing stale route cache files avoids cases where new API routes exist in code "
        "but are not registered until the cache is cleared."
    )

    pdf.step(
        7,
        "Optional - sync the 15 platform workshops",
        "When assessment templates or workshop cards must be reset/published on live:",
    )
    pdf.code(
        "cd /var/www/lecture-scientifique/backend\n"
        "php artisan assessments:sync-platform-workshops --replace"
    )
    pdf.body(
        "This reads database/data/platform-workshop-assessments.json (bundled with the deploy), "
        "archives existing platform assessments, and creates Workshops 1-15 with format_1...format_15 "
        "and grade All (Assign to All)."
    )

    pdf.step(
        8,
        "Verify and clean up",
        "Confirm the site loads, admin workshops look correct, and APIs respond. Delete temporary "
        "deploy scripts and /tmp archives from the server. Hard-refresh the browser (Ctrl+F5) "
        "so the new SPA assets load."
    )

    pdf.h2("5. Typical Python deploy script flow")
    pdf.body("The Cursor agent / local one-shot scripts follow this sequence:")
    pdf.bullet("Build archive of selected backend paths with tarfile (gzip).")
    pdf.bullet("SSH connect -> backup .env + storage.")
    pdf.bullet("SFTP put archive -> extract -> restore .env + storage.")
    pdf.bullet("Run migrate, optional assessments:sync-platform-workshops --replace.")
    pdf.bullet("Clear/rebuild config cache; remove routes*.php cache files.")
    pdf.bullet("Remove /tmp archive and local temp deploy script.")

    pdf.h2("6. What not to overwrite on live")
    pdf.table_row("Path", "Why keep server copy", header=True)
    pdf.table_row(".env", "DB password, APP_KEY, mail, domain settings")
    pdf.table_row("storage/app/public", "Uploaded content library & media")
    pdf.table_row("storage/logs", "Production diagnostics")
    pdf.ln(3)

    pdf.h2("7. Quick reference commands")
    pdf.h3("Local build")
    pdf.code('cd "Teacher Dashboard" && npm run build:deploy')
    pdf.h3("SSH probe (manual)")
    pdf.code("ssh root@146.190.248.212")
    pdf.h3("Server app directory")
    pdf.code("cd /var/www/lecture-scientifique/backend")

    pdf.h2("8. Related project files")
    pdf.bullet("DEPLOY.md - original cPanel / archive install notes (alternate path).")
    pdf.bullet("Teacher Dashboard/package.json - build:deploy script.")
    pdf.bullet("scripts/copy-spa-build.mjs - copies Vite build into backend/public.")
    pdf.bullet("backend/app/Console/Commands/SyncPlatformWorkshops.php - workshop sync.")
    pdf.bullet("backend/database/data/platform-workshop-assessments.json - workshop payloads.")

    pdf.h2("9. Troubleshooting")
    pdf.bullet("Blank page: rebuild SPA; ensure public/app.html and public/assets exist on server.")
    pdf.bullet("Old UI after deploy: hard refresh; confirm new hashed JS files under public/assets.")
    pdf.bullet("API route missing: clear route/config cache; remove bootstrap/cache/routes*.php.")
    pdf.bullet("500 errors: check storage/logs/laravel.log; fix storage permissions for www-data.")
    pdf.bullet("SSH auth failure: confirm IP, user root, and current password from the password manager.")

    pdf.ln(4)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(100, 116, 139)
    pdf.multi_cell(
        0,
        5,
        "End of guide. Keep credentials out of source control. Prefer short-lived deploy scripts "
        "that read secrets from the environment.",
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUT))
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()
