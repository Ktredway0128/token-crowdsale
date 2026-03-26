const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contract with account:", deployer.address);

    const TokenVesting = await hre.ethers.getContractFactory("TokenVesting");

    const tokenAddress = "0x036150039c33b1645080a9c913f96D4c65ccca48";

    const vesting = await TokenVesting.deploy(tokenAddress);
    await vesting.deployed();

    console.log("TokenVesting deployed to:", vesting.address);

    // Wait for block confirmations before verifying
    console.log("Waiting for block confirmations...");
    await vesting.deployTransaction.wait(5);

    // Verify on Etherscan
    console.log("Verifying contract on Etherscan...");
    await hre.run("verify:verify", {
        address: vesting.address,
        constructorArguments: [tokenAddress],
    });

    console.log("Contract verified!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
