#!/bin/bash

# Set the name of the output file
OUTPUT_FILE="project_tree.txt"

# Generate the project tree excluding all instances of node_modules, .git, and /data/mongodb
find . -type d \( -name 'node_modules' -o -name '.git' -o -path './data/mongodb' \) -prune -o -type f -print > $OUTPUT_FILE

echo "Project tree has been exported to $OUTPUT_FILE (excluding 'node_modules', '.git', and '/data/mongodb' directories)."
