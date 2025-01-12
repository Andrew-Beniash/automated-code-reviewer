#!/bin/bash

# Install Homebrew if not already installed
if ! command -v brew &> /dev/null; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
    eval "$(/opt/homebrew/bin/brew shellenv)"
fi

# Install nvm
echo "Installing nvm..."
brew install nvm

# Create nvm directory if it doesn't exist
mkdir ~/.nvm

# Add nvm configuration to ~/.zshrc
echo "Adding nvm configuration to ~/.zshrc..."
cat << 'EOF' >> ~/.zshrc

# NVM Configuration
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"  # This loads nvm
[ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"  # This loads nvm bash_completion
EOF

# Source the updated profile
source ~/.zshrc

# Install Node.js LTS version
echo "Installing Node.js LTS version..."
nvm install 18
nvm use 18

# Verify installations
echo -e "\nVerifying installations..."
echo "node version: $(node --version)"
echo "npm version: $(npm --version)"
echo "nvm version: $(nvm --version)"

# Set default Node.js version
nvm alias default 18