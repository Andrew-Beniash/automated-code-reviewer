#!/bin/bash
# Location: your_project_root/scripts/verify-redis.sh

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Get the absolute path of the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Load environment variables
ENV_FILE="$PROJECT_ROOT/.env"
if [ -f "$ENV_FILE" ]; then
    echo "Loading environment from: $ENV_FILE"
    source "$ENV_FILE"
else
    echo -e "${RED}Error: .env file not found at: $ENV_FILE${NC}"
    exit 1
fi

# Check if Redis container is running
check_redis_container() {
    echo "Checking Redis container status..."
    if docker ps | grep -q "code_reviewer_redis"; then
        echo -e "${GREEN}Redis container is running${NC}"
        return 0
    else
        echo -e "${RED}Redis container is not running${NC}"
        return 1
    fi
}

# Test Redis connection
test_redis_connection() {
    echo "Testing Redis connection..."
    if docker exec code_reviewer_redis redis-cli -a "$REDIS_PASSWORD" ping | grep -q "PONG"; then
        echo -e "${GREEN}Redis connection successful${NC}"
        return 0
    else
        echo -e "${RED}Redis connection failed${NC}"
        return 1
    fi
}

# Main verification process
echo "Starting Redis verification..."
echo "Project root: $PROJECT_ROOT"

# Start Redis container if not running
if ! check_redis_container; then
    echo "Starting Redis container..."
    docker-compose -f "$PROJECT_ROOT/docker-compose-redis.yml" up -d
    sleep 5  # Wait for container to start
fi

# Verify Redis connection
test_redis_connection

# Test basic Redis operations
echo "Testing basic Redis operations..."
docker exec code_reviewer_redis redis-cli -a "$REDIS_PASSWORD" << EOF
SET test_key "Hello Redis"
GET test_key
DEL test_key
EOF

echo -e "${GREEN}Redis verification completed successfully${NC}"