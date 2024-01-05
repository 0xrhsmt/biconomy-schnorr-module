#!/bin/bash

# check if hardhat node is already running
if ! lsof -i:8545 > /dev/null 2>&1; then
    echo "Starting Hardhat node..."
    npx hardhat node > /dev/null 2>&1 &
    sleep 3
fi