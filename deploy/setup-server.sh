#!/bin/bash

# ============================================
# Deployment Script for Sanitary Control App
# Server: 109.199.106.197
# Domain: bgmk-obsh.duckdns.org
# ============================================

set -e

echo "=== Sanitary Control Deployment Script ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Variables
DOMAIN="bgmk-obsh.duckdns.org"
DUCKDNS_TOKEN="ddd1b399-0607-4cce-82c2-8632c61c29bc"
EMAIL="admin@$DOMAIN"
APP_DIR="/opt/sanitary-control"

echo -e "${YELLOW}Step 1: System Update${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}Step 2: Install Docker${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

echo -e "${YELLOW}Step 3: Install Docker Compose${NC}"
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

echo -e "${YELLOW}Step 4: Setup Duck DNS${NC}"
mkdir -p /opt/duckdns
cat > /opt/duckdns/duck.sh << 'DUCKDNS'
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=bgmk-obsh&token=sanitary-check&ip=" | curl -k -o /opt/duckdns/duck.log -K -
DUCKDNS
chmod +x /opt/duckdns/duck.sh

# Run Duck DNS update
/opt/duckdns/duck.sh

# Add cron job for Duck DNS
(crontab -l 2>/dev/null | grep -v "duckdns"; echo "*/5 * * * * /opt/duckdns/duck.sh >/dev/null 2>&1") | crontab -

echo -e "${YELLOW}Step 5: Create Application Directory${NC}"
mkdir -p $APP_DIR
cd $APP_DIR

echo -e "${GREEN}=== Base setup complete ===${NC}"
echo ""
echo -e "${YELLOW}Now upload your application files to $APP_DIR${NC}"
echo ""
echo "Required structure:"
echo "  $APP_DIR/"
echo "  ├── docker-compose.yml"
echo "  ├── backend/"
echo "  │   ├── Dockerfile"
echo "  │   ├── server.py"
echo "  │   └── requirements.txt"
echo "  ├── frontend/"
echo "  │   ├── Dockerfile"
echo "  │   ├── nginx.conf"
echo "  │   └── (all frontend files)"
echo "  └── nginx/"
echo "      └── nginx.conf"
echo ""
echo -e "${YELLOW}After uploading, run: ./deploy-ssl.sh${NC}"
