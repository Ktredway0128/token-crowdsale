const { network } = require("hardhat");

async function main() {
  await network.provider.send("evm_increaseTime", [23 * 24 * 60 * 60]);
  await network.provider.send("evm_mine");
  console.log("⏩ Time advanced 23 days");
}

main().catch(console.error);