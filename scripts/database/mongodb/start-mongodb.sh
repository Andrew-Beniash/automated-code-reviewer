#!/bin/bash
# File: ~/Documents/Projects/automated-code-reviewer/scripts/database/mongodb/start-mongodb.sh

# Exit on any error
set -e

# Function to print error messages
error() {
    echo "ERROR: $1" >&2
    exit 1
}

# Function to print info messages
info() {
    echo "INFO: $1"
}

# Get the absolute path of the project root directory
PROJECT_ROOT="/Users/andreibeniash/Documents/Projects/automated-code-reviewer"

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    error "MongoDB is not installed. Please install it first using: brew install mongodb-community"
fi

# Create required directories
info "Creating required directories..."
mkdir -p "$PROJECT_ROOT/data/mongodb"
mkdir -p "$PROJECT_ROOT/logs/mongodb"
mkdir -p "$PROJECT_ROOT/config/mongodb"

# Set proper permissions
info "Setting directory permissions..."
chmod 755 "$PROJECT_ROOT/data/mongodb"
chmod 755 "$PROJECT_ROOT/logs/mongodb"

# Check if MongoDB is already running
if pgrep mongod >/dev/null; then
    error "MongoDB is already running. Please stop it first: brew services stop mongodb-community"
fi

# Check if config file exists
CONFIG_FILE="$PROJECT_ROOT/config/mongodb/mongod.conf"
if [ ! -f "$CONFIG_FILE" ]; then
    error "Configuration file not found at: $CONFIG_FILE"
fi

# Start MongoDB with project configuration
info "Starting MongoDB..."
cd "$PROJECT_ROOT"  # Change to project root for relative paths to work
mongod --config "$CONFIG_FILE"

# Show success message
info "MongoDB started with project configuration"
info "Data directory: $PROJECT_ROOT/data/mongodb"
info "Log file: $PROJECT_ROOT/logs/mongodb/mongo.log"
info "Configuration: $CONFIG_FILE"

echo ""
echo "To monitor MongoDB logs, run:"
echo "tail -f $PROJECT_ROOT/logs/mongodb/mongo.log"