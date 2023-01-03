# Deleted the old project before new deploy
#!/bin/bash
set -e

redis-cli flushall
sudo rm -rf /var/www/html/*