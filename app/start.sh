#!/bin/bash

# Get port from environment variable or default to 80
PORT=${PORT:-80}

# Start gunicorn with the port from environment
exec gunicorn --bind "0.0.0.0:${PORT}" --workers 4 --timeout 600 --access-logfile - --error-logfile - main:app

