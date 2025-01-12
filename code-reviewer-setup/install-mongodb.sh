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

# Check if MongoDB is already installed and running
check_mongodb_status() {
    print_message "Checking MongoDB status..."
    
    # Check if mongod process is running
    if pgrep mongod >/dev/null; then
        print_success "MongoDB is currently running"
        
        # Try to get MongoDB version
        if command -v mongod >/dev/null; then
            VERSION=$(mongod --version | grep "db version" | cut -d "v" -f2)
            print_message "Current MongoDB version: $VERSION"
            
            # Check if version meets requirement
            if [[ "$VERSION" == 6.0.* ]]; then
                print_success "MongoDB version is compatible (6.0.x)"
                return 0
            else
                print_message "Current version ($VERSION) differs from required version (6.0.9)"
                return 2
            fi
        fi
    else
        print_message "MongoDB is not running"
        return 1
    fi
}

# Install MongoDB
install_mongodb() {
    print_message "Installing MongoDB 6.0.9..."
    
    # Check if Homebrew is installed
    if ! command -v brew >/dev/null; then
        print_error "Homebrew is not installed. Please install Homebrew first."
        exit 1
    fi

    # Tap mongodb/brew if not already
    brew tap mongodb/brew

    # Install mongodb-community@6.0
    brew install mongodb-community@6.0

    # Start MongoDB service
    brew services start mongodb-community@6.0

    # Wait for service to start
    sleep 5

    # Verify installation
    if pgrep mongod >/dev/null; then
        print_success "MongoDB installed and running successfully"
    else
        print_error "MongoDB installation failed or service didn't start"
        exit 1
    fi
}

# Create initial admin user
setup_mongodb_auth() {
    print_message "Setting up MongoDB authentication..."
    
    # Prompt for admin password
    echo -n "Enter password for MongoDB admin user: "
    read -s MONGO_PASS
    echo

    # Create admin user
    mongosh admin --eval "
        db.createUser({
            user: 'admin',
            pwd: '$MONGO_PASS',
            roles: [ { role: 'root', db: 'admin' } ]
        })
    "

    # Create code_analysis database and user
    mongosh admin -u admin -p $MONGO_PASS --eval "
        use code_analysis
        db.createUser({
            user: 'code_reviewer',
            pwd: '$MONGO_PASS',
            roles: [ { role: 'dbOwner', db: 'code_analysis' } ]
        })
    "

    # Save configuration
    CONFIG_DIR=~/code-reviewer-setup/config
    mkdir -p $CONFIG_DIR

    cat > $CONFIG_DIR/mongodb.conf << EOF
# MongoDB Configuration
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DB=code_analysis
MONGO_USER=code_reviewer
MONGO_PASS=$MONGO_PASS
EOF

    chmod 600 $CONFIG_DIR/mongodb.conf
    print_success "MongoDB configuration saved in: $CONFIG_DIR/mongodb.conf"
}

# Main execution
check_mongodb_status
STATUS=$?

case $STATUS in
    0)
        print_success "MongoDB is already installed and running with correct version"
        read -p "Do you want to reset authentication? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            setup_mongodb_auth
        fi
        ;;
    1|2)
        print_message "Need to install/upgrade MongoDB..."
        # Stop existing service if running
        brew services stop mongodb-community 2>/dev/null || true
        install_mongodb
        setup_mongodb_auth
        ;;
esac

# Print usage information
cat << 'EOF'

MongoDB Usage Examples:
---------------------
1. Connect to MongoDB:
   mongosh mongodb://localhost:27017 -u code_reviewer -p your_password

2. Check status:
   brew services list | grep mongodb

3. Start/Stop commands:
   - Start:   brew services start mongodb-community@6.0
   - Stop:    brew services stop mongodb-community@6.0
   - Restart: brew services restart mongodb-community@6.0

4. View logs:
   tail -f /opt/homebrew/var/log/mongodb/mongo.log

NOTE: Replace 'your_password' with the password you set during installation
EOF