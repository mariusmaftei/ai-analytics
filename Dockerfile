FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY app/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ .

# Copy startup script
COPY app/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose port (EasyPanel will set PORT env var)
EXPOSE 80

# Use startup script to read PORT from environment
CMD ["/app/start.sh"]

