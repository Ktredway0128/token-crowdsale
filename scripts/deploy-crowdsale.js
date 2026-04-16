const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");
const path = require("path");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

const whitelist = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
];
const leaves = whitelist.map(addr => keccak256(addr));
const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
const merkleRoot = "0x" + tree.getRoot().toString("hex");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Merkle root:", merkleRoot);

  let token;
  let TOKEN_ADDRESS;

  if (hre.network.name === "hardhat" || hre.network.name === "localhost") {
    const SampleToken = await ethers.getContractFactory("SampleToken");
    token = await SampleToken.deploy(
      "Sample Token", "STK",
      ethers.utils.parseUnits("1000000", 18),
      ethers.utils.parseUnits("100000", 18)
    );
    await token.deployed();
    TOKEN_ADDRESS = token.address;
    console.log("\nDeployed local SampleToken at:", TOKEN_ADDRESS);
  } else {
    TOKEN_ADDRESS = "0x036150039c33b1645080a9c913f96D4c65ccca48";
    token = await ethers.getContractAt("SampleToken", TOKEN_ADDRESS);
    console.log("\nUsing existing SampleToken at:", TOKEN_ADDRESS);
  }

  const RATE             = 1000;
  const HARD_CAP         = ethers.utils.parseEther("10");
  const SOFT_CAP         = ethers.utils.parseEther("5");
  const MIN_CONTRIBUTION = ethers.utils.parseEther("0.1");
  const MAX_CONTRIBUTION = ethers.utils.parseEther("2");
  const SALE_DURATION    = 7 * 24 * 60 * 60;
  const VESTING_DURATION = 180 * 24 * 60 * 60;
  const CLIFF_DURATION   = 30 * 24 * 60 * 60;

  const Crowdsale = await ethers.getContractFactory("TokenCrowdsale");
  const crowdsale = await Crowdsale.deploy(
    TOKEN_ADDRESS, RATE, HARD_CAP, SOFT_CAP,
    MIN_CONTRIBUTION, MAX_CONTRIBUTION, SALE_DURATION,
    VESTING_DURATION, CLIFF_DURATION, merkleRoot, deployer.address
  );
  await crowdsale.deployed();
  console.log("\nTokenCrowdsale deployed to:", crowdsale.address);

  const tokensNeeded = HARD_CAP.mul(RATE);
  await token.transfer(crowdsale.address, tokensNeeded);
  console.log("Crowdsale funded with:", ethers.utils.formatUnits(tokensNeeded, 18), "STK");

  // Write addresses
  const deployment = {
    SampleToken:    { address: TOKEN_ADDRESS },
    TokenCrowdsale: { address: crowdsale.address }
  };

  const outputPath = path.join(__dirname, "../../Dashboards/token-crowdsale-dashboard/src/contracts/sepolia.json");
  fs.writeFileSync(outputPath, JSON.stringify(deployment, null, 2));
  console.log("\nAddresses written to sepolia.json");

  console.log("\n===== DEPLOYMENT SUMMARY =====");
  console.log("SampleToken:   ", TOKEN_ADDRESS);
  console.log("TokenCrowdsale:", crowdsale.address);
  console.log("Merkle Root:   ", merkleRoot);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });