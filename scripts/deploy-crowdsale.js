const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

async function main() {

    const [deployer, buyer1, buyer2, buyer3, buyer4, buyer5] = await ethers.getSigners();

    console.log("Deploying with account:", deployer.address);
    console.log("Buyer 1:", buyer1.address);
    console.log("Buyer 2:", buyer2.address);
    console.log("Buyer 3:", buyer3.address);
    console.log("Buyer 4:", buyer4.address);
    console.log("Buyer 5:", buyer5.address);

    // ===== DEPLOY TOKEN =====
    const Token = await ethers.getContractFactory("SampleToken");
    const token = await Token.deploy(
        "Sample Token",
        "STK",
        ethers.utils.parseUnits("1000000", 18),  // 1M max supply
        ethers.utils.parseUnits("100000", 18)     // 100K initial supply
    );
    await token.deployed();
    console.log("\nSampleToken deployed to:", token.address);

    // ===== BUILD MERKLE TREE =====
    const whitelistedAddresses = [
        buyer1.address,
        buyer2.address,
        buyer3.address,
        buyer4.address,
        buyer5.address
    ];

    const leaves = whitelistedAddresses.map(addr =>
        keccak256(Buffer.from(addr.slice(2), "hex"))
    );
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const merkleRoot = tree.getHexRoot();

    console.log("\nMerkle Root:", merkleRoot);
    console.log("Whitelisted addresses:", whitelistedAddresses);

    // ===== SALE PARAMETERS =====
    const RATE             = 1000;                                    // 1000 tokens per ETH
    const HARD_CAP         = ethers.utils.parseEther("10");           // 10 ETH
    const SOFT_CAP         = ethers.utils.parseEther("5");            // 5 ETH
    const MIN_CONTRIBUTION = ethers.utils.parseEther("0.1");          // 0.1 ETH
    const MAX_CONTRIBUTION = ethers.utils.parseEther("2");            // 2 ETH
    const SALE_DURATION    = 7 * 24 * 60 * 60;                       // 7 days
    const VESTING_DURATION = 180 * 24 * 60 * 60;                     // 180 days
    const CLIFF_DURATION   = 30 * 24 * 60 * 60;                      // 30 days

    // ===== DEPLOY CROWDSALE =====
    const Crowdsale = await ethers.getContractFactory("TokenCrowdsale");
    const crowdsale = await Crowdsale.deploy(
        token.address,
        RATE,
        HARD_CAP,
        SOFT_CAP,
        MIN_CONTRIBUTION,
        MAX_CONTRIBUTION,
        SALE_DURATION,
        VESTING_DURATION,
        CLIFF_DURATION,
        merkleRoot,
        deployer.address
    );
    await crowdsale.deployed();
    console.log("\nTokenCrowdsale deployed to:", crowdsale.address);

    // ===== FUND CROWDSALE =====
    const tokensNeeded = HARD_CAP.mul(RATE);
    await token.transfer(crowdsale.address, tokensNeeded);
    console.log("\nCrowdsale funded with:", ethers.utils.formatUnits(tokensNeeded, 18), "STK");

    // ===== LOG PROOFS FOR TESTING =====
    console.log("\n===== MERKLE PROOFS FOR TESTING =====");
    whitelistedAddresses.forEach((addr, i) => {
        const leaf = keccak256(Buffer.from(addr.slice(2), "hex"));
        const proof = tree.getHexProof(leaf);
        console.log(`\nBuyer ${i + 1} (${addr}):`);
        console.log("Proof:", JSON.stringify(proof));
    });

    // ===== SUMMARY =====
    console.log("\n===== DEPLOYMENT SUMMARY =====");
    console.log("SampleToken:", token.address);
    console.log("TokenCrowdsale:", crowdsale.address);
    console.log("Merkle Root:", merkleRoot);
    console.log("Rate:", RATE, "tokens per ETH");
    console.log("Hard Cap:", ethers.utils.formatEther(HARD_CAP), "ETH");
    console.log("Soft Cap:", ethers.utils.formatEther(SOFT_CAP), "ETH");
    console.log("Min Contribution:", ethers.utils.formatEther(MIN_CONTRIBUTION), "ETH");
    console.log("Max Contribution:", ethers.utils.formatEther(MAX_CONTRIBUTION), "ETH");
    console.log("Sale Duration:", SALE_DURATION / 86400, "days");
    console.log("Vesting Duration:", VESTING_DURATION / 86400, "days");
    console.log("Cliff Duration:", CLIFF_DURATION / 86400, "days");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });