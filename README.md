# ERC-20 TOKEN LAUNCH CONTRACT

A secure and production-ready ERC-20 token built with Solidity, OpenZeppelin, and Hardhat.

This project demonstrates the full lifecycle of a token launch including:

Smart contract development
Automated testing
Deployment scripting
Security best practices

The repository represents the foundation of an ERC-20 Token Launch package, which can be expanded with additional Web3 infrastructure such as crowdsales, vesting contracts, staking systems, and DAO governance.


## PROJECT GOALS 

The purpose of this project is to demonstrate how a modern ERC-20 token should be designed for real-world use.

The contract includes common features required by token launches:

Controlled token minting
Maximum supply limits
Emergency pause capability
Token burning
Role-based administrative permissions
Event logging for transparency

These patterns are widely used in production Web3 applications.


## SMART CONTRACT FEATURES

FIXED MAXIMUM SUPPLY

The contract enforces a hard cap on the total supply using OpenZeppelin's ERC20Capped.
This prevents tokens from being minted beyond the maximum supply.

INITIAL TOKEN MINT

When the contract is deployed, an initial supply of tokens is minted directly to the deployer.

ROLE-BASED PERMISSIONS

Administrative actions are protected using OpenZeppelin’s AccessControl.
Roles include:

ROLE DESCRIPTION

DEFAULT_ADMIN_ROLE	Can manage roles

MINTER_ROLE	Allowed to mint tokens

PAUSER_ROLE	Allowed to pause/unpause transfers

MINTING

Authorized accounts with the MINTER_ROLE can mint new tokens up to the cap.
Every mint emits a TokensMinted event.

BURNING

Any token holder can permanently destroy tokens from their own balance using the burn function.
Each burn emits a TokensBurned event.

EMERGENCY PAUSE

Authorized accounts with the PAUSER_ROLE can pause all token transfers.
This is useful if a vulnerability or emergency occurs.
Transfers resume when the contract is unpaused.

EVENT TRACKING

The contract emits events for important actions:

TokensMinted

TokensBurned

TokenPaused

TokenUnpaused

Events make it easier for applications, dashboards, and explorers to monitor contract activity.

## TECHNOLOGY STACK

This project was built using the following tools:

Solidity – Smart contract programming language

Hardhat – Ethereum development environment

Ethers.js – Contract interaction library

OpenZeppelin Contracts – Secure smart contract libraries

Mocha & Chai – JavaScript testing framework

Alchemy – Ethereum RPC provider

Sepolia Test Network – Deployment environment

## PROJECT STRUCTURE

contracts/
    SampleToken.sol

scripts/
    deploy.js

test/
    SampleToken.test.js

hardhat.config.js
.env

CONTRACTS

Contains the ERC-20 smart contract implementation.

SCRIPTS

Contains the deployment script used to deploy the token.

TESTS

Contains automated tests verifying all major contract behaviors.

## SMART CONTRACT ARCHITECTURE

The SampleToken contract extends several OpenZeppelin modules:

ERC20
ERC20Burnable
ERC20Capped
ERC20Pausable
AccessControl

This modular architecture provides strong security and reusable functionality while keeping the contract easy to audit.

## INSTALLATION

### CLONE THE REPOSITORY:

git clone https://github.com/Ktredway0128/erc20-token-launch

cd erc20-token-launch

### INSTALL DEPENDENCIES:

npm install

### COMPILE THE CONTRACT:

npx hardhat compile

### RUN THE TEST SUITE :

npx hardhat test

### 
THE TESTS VALIDATE:

Token initialization

Transfers

Mint permissions

Pause / unpause functionality

Token burning

Supply cap enforcement

Role-based access control

## ENVIRONMENT SETUP

Create a .env file in the root directory.

ALCHEMY_API_URL=YOUR_SEPOLIA_RPC_URL

DEPLOYER_PRIVATE_KEY=YOUR_PRIVATE_KEY

These values allow Hardhat to:

Connect to the Sepolia network
Sign transactions using the deployer's wallet

## DEPLOYMENT

To deploy the contract to Sepolia:

npx hardhat run scripts/deploy.js --network sepolia

The deployment script performs the following steps:

Retrieves the deployer wallet
Creates the contract factory
Deploys the token with constructor parameters
Waits for confirmation
Outputs the deployed contract address

## EXAMPLE TOKEN CONFIGURATION

Example parameters used in deployment:

Token Name: Sample Token

Token Symbol: STK

Maximum Supply: 1,000,000 tokens

Initial Supply: 100,000 tokens


## SECURITY PRACTICES

The contract uses well-established patterns from OpenZeppelin including:

Supply caps

Role-based permissions

Emergency pause mechanisms

Audited contract libraries

These are common practices used in production smart contracts.

## EXAMPLE USE CASES

This ERC-20 architecture can support many types of projects:

DAO governance tokens

Startup utility tokens

Game economies

Loyalty rewards

DeFi protocol tokens

## FUTURE ENHANCEMENTS

This project serves as the base layer for a larger Web3 infrastructure package.

Possible upgrades include:

Token crowdsale contracts

Investor vesting schedules

Staking rewards

Governance (DAO voting)

Treasury management

Upgradeable proxy contracts

## AUTHOR

Kyle Tredway

Smart Contract Developer/Token Launch Specialist

License

MIT License