#!/bin/bash
set -e

sudo chmod -R 777 /var/www/html/*

sudo pm2 update

cd /var/www/html/BE

npm install
sudo pm2 reload ecosystem.config.js --update-env
sudo pm2 save