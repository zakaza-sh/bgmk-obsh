#!/bin/bash

# ============================================
# SSL Certificate Setup & Final Deployment
# ============================================

set -e

DOMAIN="bgmk-obsh.duckdns.org"
APP_DIR="/opt/sanitary-control"
EMAIL="admin@bgmk-obsh.duckdns.org"

cd $APP_DIR

echo "=== Step 1: Create temporary nginx config for SSL ==="

# Create temporary nginx config without SSL
mkdir -p nginx
cat > nginx/nginx.conf << 'NGINXTEMP'
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name bgmk-obsh.duckdns.org;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 'Server is running';
            add_header Content-Type text/plain;
        }
    }
}
NGINXTEMP

echo "=== Step 2: Start nginx for certificate request ==="
mkdir -p certbot/conf certbot/www

docker run -d --name temp-nginx \
    -p 80:80 \
    -v $APP_DIR/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
    -v $APP_DIR/certbot/www:/var/www/certbot:ro \
    nginx:alpine

sleep 5

echo "=== Step 3: Request SSL Certificate ==="
docker run --rm \
    -v $APP_DIR/certbot/conf:/etc/letsencrypt \
    -v $APP_DIR/certbot/www:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

echo "=== Step 4: Stop temporary nginx ==="
docker stop temp-nginx
docker rm temp-nginx

echo "=== Step 5: Restore full nginx config ==="
cat > nginx/nginx.conf << 'NGINXFULL'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    upstream backend {
        server backend:8001;
    }

    upstream frontend {
        server frontend:80;
    }

    server {
        listen 80;
        server_name bgmk-obsh.duckdns.org;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name bgmk-obsh.duckdns.org;

        ssl_certificate /etc/letsencrypt/live/bgmk-obsh.duckdns.org/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/bgmk-obsh.duckdns.org/privkey.pem;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers off;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;

        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;

        location /api {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 300s;
        }

        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
NGINXFULL

echo "=== Step 6: Build and Start Application ==="
docker-compose up -d --build

echo ""
echo "=== DEPLOYMENT COMPLETE ==="
echo ""
echo "Your app is now available at:"
echo "  https://bgmk-obsh.duckdns.org"
echo ""
echo "Useful commands:"
echo "  docker-compose logs -f     # View logs"
echo "  docker-compose restart     # Restart services"
echo "  docker-compose down        # Stop services"
echo ""
