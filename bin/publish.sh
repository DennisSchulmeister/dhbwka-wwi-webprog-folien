#! /bin/sh
set -e

npm run build
#rsync -rvz build/ dennis@pingu-mobil.de:/srv/www/www.wpvs.de/repo/webprog/folien
#rsync -rvz build/ dennis@vhermes:/srv/www/www.wpvs.de/repo/webprog/folien
rsync -rvz -e 'ssh -p 4444' build/ dennis@wikiberd.de:/srv/www/www.wpvs.de/repo/webprog/folien
