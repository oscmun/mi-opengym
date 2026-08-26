#!/bin/sh
# Runs both processes App Service expects in one container; exits (and restarts the
# container) if either dies, since a proxy with no backend (or vice versa) is useless.
# (busybox ash has no `wait -n`, hence the poll loop instead of a bash-style wait.)
set -e

node /app/api/server.js &
API_PID=$!

nginx -g 'daemon off;' &
NGINX_PID=$!

while kill -0 "$API_PID" 2>/dev/null && kill -0 "$NGINX_PID" 2>/dev/null; do
    sleep 2
done

kill "$API_PID" "$NGINX_PID" 2>/dev/null
exit 1
