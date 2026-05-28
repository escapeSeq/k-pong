#!/bin/sh
set -e

BACKEND_URL="${REACT_APP_BACKEND_URL:-http://localhost:5301}"
# Strip trailing slash
BACKEND_URL="${BACKEND_URL%/}"

cat > /app/public/config.js <<EOF
window.__K_PONG_CONFIG__ = {
  BACKEND_URL: '${BACKEND_URL}',
};
EOF

echo "Wrote runtime config: BACKEND_URL=${BACKEND_URL}"
exec "$@"
