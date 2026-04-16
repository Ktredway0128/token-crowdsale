const { network } = require("hardhat");

async function main() {
  await network.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
  await network.provider.send("evm_mine");
  console.log("⏩ Time advanced 7 days");
}

main().catch(console.error);
