#! /bin/sh
set -e

npm run build
#rsync -avz --delete --checksum build/ dennis@hermes:/srv/www/www.wpvs.de/repo/webprog/skript
rsync -avz --delete --checksum -e 'ssh -p 4444' build/ dennis@wikiberd.de:/srv/www/www.wpvs.de/repo/webprog/skript
