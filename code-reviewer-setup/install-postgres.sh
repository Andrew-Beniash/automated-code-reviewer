#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_message() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Stop PostgreSQL service if running
print_message "Stopping PostgreSQL service if running..."
brew services stop postgresql@15

# Unload the launchd service
print_message "Cleaning up launchd service..."
launchctl unload ~/Library/LaunchAgents/homebrew.mxcl.postgresql@15.plist 2>/dev/null || true

# Remove old launch agent file if exists
rm -f ~/Library/LaunchAgents/homebrew.mxcl.postgresql@15.plist

# Start PostgreSQL service
print_message "Starting PostgreSQL service..."
brew services start postgresql@15

# Wait for PostgreSQL to start
sleep 5

# Verify PostgreSQL is running
if pgrep -x "postgres" > /dev/null; then
    print_success "PostgreSQL is running"
else
    print_error "PostgreSQL is not running. Please run: sudo brew services start postgresql@15"
    exit 1
fi

# Reset password for existing user
print_message "Setting up database user..."

# Prompt for new password
echo -n "Enter new password for postgres user 'code_reviewer': "
read -s DB_PASSWORD
echo

# Try to create user if doesn't exist, otherwise alter password
psql postgres -c "DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'code_reviewer') THEN
        CREATE USER code_reviewer WITH PASSWORD '$DB_PASSWORD';
    ELSE
        ALTER USER code_reviewer WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;" || {
    print_error "Failed to manage user"
    exit 1
}

# Create database if doesn't exist
psql postgres -c "SELECT 'CREATE DATABASE code_reviewer OWNER code_reviewer' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'code_reviewer')\gexec"

# Grant privileges
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE code_reviewer TO code_reviewer;" || {
    print_error "Failed to grant privileges"
    exit 1
}

# Test connection with new password
PGPASSWORD=$DB_PASSWORD psql -U code_reviewer -d code_reviewer -h localhost -c "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "Connection test successful!"
else
    print_error "Connection test failed. Please check your password and try again."
    exit 1
fi

# Create configuration file
CONFIG_DIR=~/code-reviewer-setup/config
mkdir -p $CONFIG_DIR

cat > $CONFIG_DIR/database.conf << EOF
# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=code_reviewer
DB_USER=code_reviewer
DB_PASSWORD=$DB_PASSWORD
EOF

chmod 600 $CONFIG_DIR/database.conf

print_success "Setup completed successfully!"
print_message "Configuration saved in: $CONFIG_DIR/database.conf"

# Show current PostgreSQL status
print_message "Current PostgreSQL Status:"
brew services list | grep postgresql

cat << 'EOF'

Usage Examples:
--------------
1. Connect to database:
   PGPASSWORD=your_password psql -d code_reviewer -U code_reviewer

2. List all databases:
   PGPASSWORD=your_password psql -U code_reviewer -c '\l'

3. Show current connections:
   PGPASSWORD=your_password psql -U code_reviewer -c 'SELECT * FROM pg_stat_activity;'

4. Service management:
   - Stop:  brew services stop postgresql@15
   - Start: brew services start postgresql@15
   - Restart: brew services restart postgresql@15

NOTE: Replace 'your_password' with the password you just set.
EOF