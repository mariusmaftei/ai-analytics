#!/bin/bash

# Get port from environment variable or default to 80
PORT=${PORT:-80}

# Calculate workers based on available memory
# For low-memory VPS (1GB): use 1 worker
# For medium VPS (2-4GB): use 2 workers
# For high-memory VPS (8GB+): use 4+ workers
WORKERS=${GUNICORN_WORKERS:-1}

# Memory-optimized Gunicorn settings for 1GB RAM VPS
# - 1 worker to minimize memory usage
# - Reduced timeout for faster cleanup
# - Preload app to share memory between processes (not used with 1 worker, but good practice)
exec gunicorn --bind "0.0.0.0:${PORT}" \
    --workers ${WORKERS} \
    --timeout 300 \
    --keep-alive 5 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    main:app

