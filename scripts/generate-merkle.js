const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const fs = require("fs");
const path = require("path");

// ===== WHITELIST =====
// For local Hardhat testing — replace with real addresses for Sepolia
const WHITELISTED_ADDRESSES = [
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
];

async function main() {

    // ===== BUILD MERKLE TREE =====
    const leaves = WHITELISTED_ADDRESSES.map(addr =>
        keccak256(Buffer.from(addr.slice(2), "hex"))
    );
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const merkleRoot = tree.getHexRoot();

    console.log("Merkle Root:", merkleRoot);

    // ===== GENERATE PROOFS =====
    const proofs = {};
    WHITELISTED_ADDRESSES.forEach(addr => {
        const leaf = keccak256(Buffer.from(addr.slice(2), "hex"));
        const proof = tree.getHexProof(leaf);
        proofs[addr.toLowerCase()] = proof;
    });

    // ===== OUTPUT =====
    const outputPath = path.join(__dirname, "../../Dashboards/erc20-crowdsale-dashboard/src/proofs.json");
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