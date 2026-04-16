const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contract with account:", deployer.address);

    const SampleToken = await hre.ethers.getContractFactory("SampleToken");

    const name = "Sample Token";
    const symbol = "STK";
    const cap = hre.ethers.utils.parseUnits("1000000", 18);
    const initialSupply = hre.ethers.utils.parseUnits("100000", 18);

    const token = await SampleToken.deploy(name, symbol, cap, initialSupply);
    await token.deployed();

    console.log("SampleToken deployed to:", token.address);

    // ✅ Only run this on real networks (like Sepolia)
    if (hre.network.name !== "hardhat") {
        console.log("Waiting for block confirmations...");
        await token.deployTransaction.wait(5);

        console.log("Verifying contract on Etherscan...");
        await hre.run("verify:verify", {
            address: token.address,
            constructorArguments: [name, symbol, cap, initialSupply],
        });

        console.log("Contract verified!");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});









// const hre = require("hardhat");

// async function main() {
//     const [deployer] = await hre.ethers.getSigners();
//     console.log("Deploying contract with account:", deployer.address);

//     const SampleToken = await hre.ethers.getContractFactory("SampleToken");

//     const name = "Sample Token";
//     const symbol = "STK";
//     const cap = hre.ethers.utils.parseUnits("1000000", 18);
//     const initialSupply = hre.ethers.utils.parseUnits("100000", 18);

//     const token = await SampleToken.deploy(name, symbol, cap, initialSupply);
//     await token.deployed();

//     console.log("SampleToken deployed to:", token.address);

//     // Wait for a few block confirmations before verifying
//     console.log("Waiting for block confirmations...");
//     await token.deployTransaction.wait(5);

//     // Verify on Etherscan
//     console.log("Verifying contract on Etherscan...");
//     await hre.run("verify:verify", {
//         address: token.address,
//         constructorArguments: [name, symbol, cap, initialSupply],
//     });

//     console.log("Contract verified!");
// }

// main().catch((error) => {
//     console.error(error);
//     process.exitCode = 1;
// });
