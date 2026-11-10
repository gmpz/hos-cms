# Production deployment

The supported hospital deployment is one Ubuntu server running Nginx, PM2, Next.js,
and MySQL. Uploaded bytes are persistent state and must never be stored inside a
release directory.

## Filesystem layout

```text
/var/www/hos-cms/
├── current -> releases/2026-10-20-001
├── releases/
│   ├── 2026-10-19-001/
│   └── 2026-10-20-001/
└── shared/
    └── .env

/var/lib/hos-cms/
└── uploads/
```

- `releases` contains immutable application versions.
- `current` points to the active release.
- `shared/.env` contains production secrets and is symlinked into each release.
- `/var/lib/hos-cms/uploads` survives deployments and rollbacks.
- MySQL is backed up separately from application releases.

## Initial server preparation

Replace `hoscms` with the Linux account that runs the application. Configure the
database and secrets before starting PM2.

```bash
sudo useradd --system --create-home --shell /bin/bash hoscms
sudo mkdir -p /var/www/hos-cms/releases /var/www/hos-cms/shared
sudo mkdir -p /var/lib/hos-cms/uploads
sudo chown -R hoscms:hoscms /var/www/hos-cms /var/lib/hos-cms
sudo chmod 750 /var/www/hos-cms/shared /var/lib/hos-cms/uploads
sudo usermod -aG hoscms www-data
```

The production `/var/www/hos-cms/shared/.env` must include at least:

```dotenv
NODE_ENV="production"
DATABASE_URL="mysql://hos_cms:strong-password@127.0.0.1:3306/hos_cms"
SESSION_COOKIE_SECURE="true"
MEDIA_STORAGE_DIRECTORY="/var/lib/hos-cms/uploads"
```

Install the Nginx template from `deploy/nginx/hos-cms.conf`, replace
`hospital.example.go.th` and the hospital TLS certificate paths, test it
with `sudo nginx -t`, and reload Nginx. Nginx must be able to traverse and read the
uploads directory but must not have write permission.

If files already exist in a former release, migrate them once before switching:

```bash
sudo rsync -a --ignore-existing /path/to/old-release/public/uploads/ /var/lib/hos-cms/uploads/
sudo chown -R hoscms:hoscms /var/lib/hos-cms/uploads
```

## Release procedure

Use a unique release ID and perform the build in the new directory. Do not edit the
active release in place.

```bash
release_id=2026-10-20-001
release_dir=/var/www/hos-cms/releases/$release_id

sudo -u hoscms mkdir "$release_dir"
# Copy or extract the reviewed source into "$release_dir" here.
sudo -u hoscms ln -s /var/www/hos-cms/shared/.env "$release_dir/.env"

cd "$release_dir"
sudo -u hoscms npm ci
sudo -u hoscms npm run build
sudo -u hoscms npx prisma migrate status
```

Before applying migrations, take coordinated backups of MySQL and uploaded files:

```bash
backup_id=$(date +%Y%m%d-%H%M%S)
sudo install -d -o "$USER" -g "$USER" -m 750 "/var/backups/hos-cms/$backup_id"
mysqldump --single-transaction --routines --triggers hos_cms > "/var/backups/hos-cms/$backup_id/database.sql"
sudo tar -C /var/lib/hos-cms -czf "/var/backups/hos-cms/$backup_id/uploads.tar.gz" uploads
```

Apply committed migrations, remove development packages, switch the symlink
atomically, and reload the configured PM2 process:

```bash
cd "$release_dir"
sudo -u hoscms npm run db:deploy
sudo -u hoscms npm prune --omit=dev
sudo -u hoscms ln -sfn "$release_dir" /var/www/hos-cms/current

sudo -u hoscms pm2 reload /var/www/hos-cms/current/ecosystem.config.cjs --update-env
curl --fail http://127.0.0.1:3000/api/health
sudo -u hoscms pm2 logs hos-cms --lines 100 --nostream
```

For the first deployment use `pm2 start` instead of `pm2 reload`, then register the
startup service:

```bash
sudo -u hoscms pm2 start /var/www/hos-cms/current/ecosystem.config.cjs
sudo -u hoscms pm2 save
sudo env PATH="$PATH" pm2 startup systemd -u hoscms --hp /home/hoscms
```

Run the exact command printed by `pm2 startup`, then run `sudo -u hoscms pm2 save`
again. Keep at least the previous two known-good release directories.

## Rollback

Application rollback changes the `current` symlink back to a known-good release and
reloads PM2:

```bash
sudo -u hoscms ln -sfn /var/www/hos-cms/releases/2026-10-19-001 /var/www/hos-cms/current
sudo -u hoscms pm2 reload /var/www/hos-cms/current/ecosystem.config.cjs --update-env
curl --fail http://127.0.0.1:3000/api/health
```

Do not automatically reverse Prisma migrations during application rollback. Schema
changes must be designed to remain compatible with the immediately previous release;
restore the database backup only as a separately approved recovery operation.

## Required checks after every deployment

1. `/api/health` returns HTTP 200 and `{ "status": "ok" }`.
2. Login, public pages, and one administration page load successfully.
3. Upload and read a test file through `/uploads/`.
4. PM2 logs contain no recurring errors.
5. Nginx access/error logs contain no unexpected 5xx responses.
6. The MySQL and upload backups exist and are readable.
