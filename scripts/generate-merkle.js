const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const fs = require("fs");
const path = require("path");

// ===== WHITELIST =====
// For local Hardhat testing — replace with real addresses for Sepolia
const WHITELISTED_ADDRESSES = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
];

async function main() {

    // ===== BUILD MERKLE TREE =====
    const leaves = WHITELISTED_ADDRESSES.map(addr => keccak256(addr));
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const merkleRoot = tree.getHexRoot();

    console.log("Merkle Root:", merkleRoot);

    // ===== GENERATE PROOFS =====
    const proofs = {};
    WHITELISTED_ADDRESSES.forEach(addr => {
        const leaf = keccak256(addr);
        const proof = tree.getHexProof(leaf);
        proofs[addr.toLowerCase()] = proof;
    });

    // ===== OUTPUT =====
    const outputPath = path.join(__dirname, "../../Dashboards/token-crowdsale-dashboard/src/proofs-local.json");
    fs.writeFileSync(outputPath, JSON.stringify(proofs, null, 2));

    console.log("\nproofs.json written to src/proofs.json");
    console.log("\nWhitelisted addresses:");
    WHITELISTED_ADDRESSES.forEach((addr, i) => {
        console.log(`  ${i + 1}. ${addr}`);
        console.log(`     Proof: ${JSON.stringify(proofs[addr.toLowerCase()])}`);
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });