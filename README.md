# ERC-20 TOKEN CROWDSALE CONTRACT

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Solidity](https://img.shields.io/badge/Solidity-0.8.19-blue)
![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow)

Built by [Tredway Development](https://kyle-tredway-portfolio.netlify.app/) — professional Solidity smart contract packages for Web3 companies.

A secure and production-ready ERC-20 token crowdsale contract built with Solidity, OpenZeppelin, and Hardhat.

> ⚠️ This contract has not been professionally audited. A full security audit is strongly recommended before any mainnet deployment.


This project demonstrates the full lifecycle of a token fundraising system including:

Smart contract development
Automated testing
Deployment scripting
Merkle tree whitelist verification
ETH-based token purchases
Purchaser vesting with cliff periods
Soft cap and hard cap enforcement
Refund distribution on failed raises
Security best practices

This repository represents the fifth package in a Web3 infrastructure suite, providing the fundraising layer that powers the token economy built on top of the ERC-20 Token Launch, Token Vesting, Merkle Airdrop, and Token Staking contracts.


## PROJECT GOALS

The purpose of this project is to demonstrate how a modern token crowdsale should be designed for real-world use.

The system includes common features required by token fundraising:

ETH-based token purchases with a configurable rate
Hard cap to limit total raise amount
Soft cap to protect investors with automatic refunds on failed raises
Merkle tree whitelist to control who can participate
Purchaser vesting with mandatory cliff periods to prevent day-one dumping
Role-based administrative permissions
Emergency pause capability
Event logging for transparency

These patterns are widely used in production Web3 token launches.


## SMART CONTRACT FEATURES

### ERC-20 TOKEN

FIXED MAXIMUM SUPPLY

The contract enforces a hard cap on the total supply using OpenZeppelin's ERC20Capped.
This prevents tokens from being minted beyond the maximum supply.

INITIAL TOKEN MINT

When the contract is deployed, an initial supply of tokens is minted directly to the deployer.

ROLE-BASED PERMISSIONS

Administrative actions are protected using OpenZeppelin's AccessControl.
Roles include:

ROLE                DESCRIPTION

DEFAULT_ADMIN_ROLE  Can manage roles
MINTER_ROLE         Allowed to mint tokens
PAUSER_ROLE         Allowed to pause/unpause transfers

### TOKEN CROWDSALE

ETH-BASED PURCHASES

Buyers send ETH directly to the contract and receive tokens at a configurable rate.
No token approval is required from the buyer — a single transaction completes the purchase.
Every purchase emits a TokensPurchased event.

MERKLE WHITELIST

Eligible addresses are stored off-chain in a Merkle tree.
Only one Merkle root hash is stored on-chain representing the entire whitelist.
Buyers submit a Merkle proof to verify eligibility before purchasing.
The Merkle root can be updated by the admin before the sale starts.

HARD CAP AND SOFT CAP

The hard cap is the maximum amount of ETH the sale will accept.
Once the hard cap is reached no further purchases are allowed.
The soft cap is the minimum viable raise amount.
If the soft cap is not reached by the end of the sale all buyers receive a full ETH refund.
If the soft cap is reached all raised ETH is transferred to the admin on finalization.

MINIMUM AND MAXIMUM CONTRIBUTIONS

Each purchase must meet a minimum ETH contribution to prevent dust transactions.
Each wallet has a maximum cumulative contribution limit to ensure fair distribution.

PURCHASER VESTING

Tokens purchased in the crowdsale are locked and vest linearly over a configurable duration.
A mandatory cliff period is enforced from each buyer's purchase timestamp.
No tokens are claimable until the cliff has passed regardless of elapsed time.
After the cliff, tokens release linearly until fully vested.
The vesting clock starts at each buyer's individual purchase date, staggering unlocks
and reducing sell pressure at any single point in time.

SALE LIFECYCLE

The admin sets all parameters at deployment including rate, caps, duration, and vesting terms.
The admin calls startSale to begin the sale period and fund the token pool.
The contract verifies it holds enough tokens to cover the hard cap before starting.
After the sale period ends or the hard cap is reached the admin calls finalizeSale.
Finalization distributes ETH to the admin if the soft cap was reached, or enables
refunds for all buyers if the soft cap was not reached.

CLAIM TOKENS

After the sale is finalized and the soft cap was reached buyers can claim their vested tokens.
Tokens become claimable incrementally as the vesting schedule progresses.
Buyers can claim multiple times as additional tokens vest over time.
Every claim emits a TokensClaimed event.

CLAIM REFUNDS

If the soft cap was not reached after finalization buyers can claim a full ETH refund.
Each wallet can only claim its refund once.
Every refund emits a RefundClaimed event.

RATE AND MERKLE ROOT UPDATES

The admin can update the token rate and Merkle root before the sale starts.
Both are locked once the sale begins to protect buyers from rule changes mid-sale.

EMERGENCY PAUSE

The admin can pause all purchasing activity at any time.
Claim and refund functions remain available while paused.
Purchasing resumes when the contract is unpaused.

TOKEN RECOVERY

Admins can recover accidentally sent tokens using recoverTokens.
The sale token cannot be recovered by design.
Every recovery emits a TokensRecovered event.

ADMIN ROLE PROTECTION

The contract prevents the admin from accidentally renouncing the DEFAULT_ADMIN_ROLE.
This ensures the contract can never be permanently locked without an administrator.

EVENT TRACKING

The contract emits events for all important actions:

SaleStarted, TokensPurchased, TokensClaimed, RefundClaimed
SaleFinalized, MerkleRootUpdated, RateUpdated, TokensRecovered


## TECHNOLOGY STACK

This project was built using the following tools:

Solidity – Smart contract programming language

Hardhat – Ethereum development environment

Ethers.js – Contract interaction library

OpenZeppelin Contracts – Secure smart contract libraries

Mocha & Chai – JavaScript testing framework

merkletreejs – Merkle tree generation library

keccak256 – Hashing library for Merkle leaves

Alchemy – Ethereum RPC provider

Sepolia Test Network – Deployment environment


## PROJECT STRUCTURE

contracts/
    SampleToken.sol
    TokenCrowdsale.sol

scripts/
    deploy-crowdsale.js
    generate-merkle.js

test/
    SampleToken.test.js
    TokenCrowdsale.test.js

hardhat.config.js
.env

CONTRACTS

Contains both smart contract implementations.

SCRIPTS

Contains the deployment script and the Merkle tree generation script.

TESTS

Contains 141 automated tests verifying all major contract behaviors across both contracts.


## SMART CONTRACT ARCHITECTURE

The SampleToken contract extends the following OpenZeppelin modules:

ERC20, ERC20Burnable, ERC20Capped, ERC20Pausable, AccessControl

The TokenCrowdsale contract extends the following OpenZeppelin modules:

ReentrancyGuard, AccessControl, Pausable, SafeERC20, IERC20, MerkleProof

This modular architecture provides strong security and reusable functionality while keeping the contracts easy to audit.

Key state variables:

rate               – Tokens distributed per ETH
hardCap            – Maximum ETH the sale will accept
softCap            – Minimum ETH required for a successful raise
minContribution    – Minimum ETH per purchase
maxContribution    – Maximum cumulative ETH per wallet
saleDuration       – Length of the sale period in seconds
vestingDuration    – How long purchased tokens vest
cliffDuration      – Cliff period before any tokens are claimable
merkleRoot         – Merkle root representing the whitelist
totalRaised        – Total ETH raised during the sale
totalTokensSold    – Total tokens sold during the sale
contributions      – ETH contributed per wallet
tokensPurchased    – Tokens bought per wallet
tokensClaimed      – Tokens claimed so far per wallet
purchaseTimestamp  – When each wallet made their first purchase
refundClaimed      – Whether a wallet has claimed their refund


## INSTALLATION

### CLONE THE REPOSITORY:

git clone https://github.com/Ktredway0128/erc20-token-crowdsale

cd erc20-token-crowdsale

### INSTALL DEPENDENCIES:

npm install

### COMPILE THE CONTRACTS:

npx hardhat compile

### RUN THE TEST SUITE:

npx hardhat test

### THE TESTS VALIDATE:

Token initialization, transfers, minting, burning, pausing, and access control
Sale deployment and constructor validation
Sale start, purchase flow, whitelist verification, cap enforcement
Vesting math, cliff enforcement, partial and full claims
Soft cap failure path, refund eligibility, and refund distribution
Finalization for both successful and failed raises
Pause and unpause behavior
Admin role protection and access control
Token recovery functionality
Edge cases including boundary contributions and wrong proofs


## ENVIRONMENT SETUP

Create a .env file in the root directory.

ALCHEMY_API_URL=YOUR_SEPOLIA_RPC_URL

DEPLOYER_PRIVATE_KEY=YOUR_PRIVATE_KEY

ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY

These values allow Hardhat to:

Connect to the Sepolia network
Sign transactions using the deployer's wallet


## DEPLOYMENT

### STEP 1 - Build your whitelist and generate the Merkle tree:

Add your whitelisted wallet addresses to scripts/generate-merkle.js then run:

node scripts/generate-merkle.js

This outputs the Merkle root and writes proofs.json to your frontend src folder.

### STEP 2 - Copy the Merkle root into deploy-crowdsale.js and set your sale parameters:

rate, hardCap, softCap, minContribution, maxContribution
saleDuration, vestingDuration, cliffDuration

### STEP 3 - Deploy the token:

npx hardhat run scripts/deploy-token.js --network sepolia

### STEP 4 - Copy the token address into deploy-crowdsale.js then deploy:

npx hardhat run scripts/deploy-crowdsale.js --network sepolia

### STEP 5 - Fund the crowdsale contract with enough tokens to cover the hard cap:

The deploy script handles this automatically using the configured hard cap and rate.

### STEP 6 - Start the sale from the admin dashboard:

Call startSale from the admin panel once you are ready to open purchases.

The deployment scripts perform the following steps:

Retrieve the deployer wallet
Create the contract factory
Deploy each contract with the required parameters
Wait for confirmation
Output the deployed contract address

### SEPOLIA TESTNET DEPLOYMENT

| Contract | Address | Etherscan |
|----------|---------|-----------|
| SampleToken | `0x036150039c33b1645080a9c913f96D4c65ccca48` | [View on Etherscan](https://sepolia.etherscan.io/address/0x036150039c33b1645080a9c913f96D4c65ccca48#code) |
| TokenCrowdsale | `pending` | pending |

Deployed: pending


## EXAMPLE SALE CONFIGURATION

Token Name: Sample Token
Token Symbol: STK
Rate: 1000 STK per ETH
Hard Cap: 10 ETH
Soft Cap: 5 ETH
Min Contribution: 0.1 ETH
Max Contribution: 2 ETH
Sale Duration: 7 days
Cliff Period: 30 days
Vesting Duration: 180 days

Example token distribution:

Crowdsale contract:  10,000 tokens  ← maximum sale allocation at hard cap
Deployer keeps:      90,000 tokens  ← treasury, team vesting, and operations


## DESIGN DECISIONS

PURCHASER VESTING FROM PURCHASE DATE

Each buyer's vesting clock starts at their individual purchase timestamp rather than
a fixed sale start date. This staggers token unlocks across all buyers, reducing
concentrated sell pressure at any single point in time and creating fairer distribution
for both early and late participants.

MANDATORY CLIFF PERIOD

Every deployment requires a cliff duration greater than zero. There is no way to deploy
without a cliff period by design. This prevents purchased tokens from being dumped
immediately after the sale ends and protects the token price at launch.

SOFT CAP REFUND PROTECTION

If the soft cap is not reached buyers can always reclaim their full ETH contribution.
The contract holds all ETH until finalization and only releases it to the admin if
the raise was successful. This protects buyers from contributing to a failed raise.

SINGLE ETH TRANSACTION PURCHASES

Buyers send ETH in a single transaction with no prior approval required. This is
simpler and safer than ERC-20 based payment which requires two transactions.


## SECURITY PRACTICES

The contract uses well-established patterns from OpenZeppelin including:

Role-based permissions
Emergency pause mechanism
ReentrancyGuard on all purchase, claim, and refund functions
SafeERC20 for safe token transfers
Merkle proof verification for whitelist eligibility
ETH transfer using call pattern for safe refund distribution
Protected admin role renunciation
Audited contract libraries

These are common practices used in production smart contracts.


## EXAMPLE USE CASES

This crowdsale contract can support many types of projects:

Public or private token sale fundraising
Whitelist-gated presales for early supporters
Community token launches with fair contribution limits
DAO treasury funding rounds
DeFi protocol token distributions with built-in vesting
Game economy token launches


## FUTURE ENHANCEMENTS

This project serves as the fifth layer in a larger Web3 infrastructure package.

Possible upgrades include:

Governance DAO voting contract
Treasury management contract
Upgradeable proxy contracts
USDC or stablecoin payment support
Tiered contribution levels with different rates


## AUTHOR

Kyle Tredway

Smart Contract Developer / Token Launch Specialist

License

MIT License