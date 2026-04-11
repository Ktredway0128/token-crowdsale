const { ethers } = require("hardhat");

async function main() {

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // ===== EXISTING TOKEN =====
    const TOKEN_ADDRESS = "0x036150039c33b1645080a9c913f96D4c65ccca48";
    const Token = await ethers.getContractAt("SampleToken", TOKEN_ADDRESS);
    console.log("\nUsing existing SampleToken at:", TOKEN_ADDRESS);

    // ===== SALE PARAMETERS =====
    const RATE             = 1000;
    const HARD_CAP         = ethers.utils.parseEther("10");
    const SOFT_CAP         = ethers.utils.parseEther("5");
    const MIN_CONTRIBUTION = ethers.utils.parseEther("0.1");
    const MAX_CONTRIBUTION = ethers.utils.parseEther("2");
    const SALE_DURATION    = 7 * 24 * 60 * 60;
    const VESTING_DURATION = 180 * 24 * 60 * 60;
    const CLIFF_DURATION   = 30 * 24 * 60 * 60;
    const merkleRoot       = "0xf42831cc5ba4f7f3a25fed4059bb72a512f55cd08312864b2d7a05a94d25532e";

    // ===== DEPLOY CROWDSALE =====
    const Crowdsale = await ethers.getContractFactory("TokenCrowdsale");
    const crowdsale = await Crowdsale.deploy(
        TOKEN_ADDRESS,
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
    await Token.transfer(crowdsale.address, tokensNeeded);
    console.log("\nCrowdsale funded with:", ethers.utils.formatUnits(tokensNeeded, 18), "STK");

    // ===== SUMMARY =====
    console.log("\n===== DEPLOYMENT SUMMARY =====");
    console.log("SampleToken:", TOKEN_ADDRESS);
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