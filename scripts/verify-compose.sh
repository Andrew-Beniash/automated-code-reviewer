#!/bin/bash
# Save as: /your_project_root/scripts/verify-compose.sh

echo "Verifying Docker Compose installation..."

# Check Docker Compose version
docker compose version

# Test Docker Compose functionality
echo "Testing Docker Compose with test configuration..."
docker compose -f ../docker-compose-test.yml up -d

# Wait for containers to start
sleep 5

# Check container status
docker compose -f ../docker-compose-test.yml ps

# Clean up
echo "Cleaning up test containers..."
docker compose -f ../docker-compose-test.yml down -v