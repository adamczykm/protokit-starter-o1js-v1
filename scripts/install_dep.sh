#!/bin/bash

# Usage: ./install_dep.sh <REPO_URL> <BRANCH_NAME> <DEP_NAME> 
# Example: ./install_dep.sh https://github.com/adamczykm/protokit-framework o1js-1 protokit-framework 

# Function to display error messages and exit
function error_exit {
  echo "Error: $1" >&2
  exit 1
}

echo "Run the script from the root monorepo directory."


# Check if the correct number of arguments is provided
if [ "$#" -ne 3 ]; then
  error_exit "Usage: $0 <REPO_URL> <BRANCH_NAME> <DEP_NAME>"
fi

# Assign command line arguments to variables
REPO_URL=$1
BRANCH_NAME=$2
TARGET_PATH=./deps/$3

# mk dep dir if doesnt exist
mkdir -p ./deps

# # Clone the repository

echo "Cloning repository from $REPO_URL to $TARGET_PATH..."
if ! git clone "$REPO_URL" "$TARGET_PATH"; then
  error_exit "Failed to clone repository from $REPO_URL"
fi

# Navigate to the target directory
cd "$TARGET_PATH" || error_exit "Failed to navigate to $TARGET_PATH"

# # Switch to the specified branch
echo "Switching to branch $BRANCH_NAME..."
if ! git checkout "$BRANCH_NAME"; then
  error_exit "Failed to switch to branch $BRANCH_NAME"
fi

# # Install dependencies
echo "Installing dependencies..."
if ! npm install; then
  error_exit "Failed to install dependencies"
fi

# # Build the project
echo "Building the project..."
if ! npm run build; then
  error_exit "Failed to build the project"
fi

echo "Setup completed successfully!"
