const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const fs = require("fs");
const path = require("path");

// ===== WHITELIST =====
// For local Hardhat testing — replace with real addresses for Sepolia
const WHITELISTED_ADDRESSES = [
    "0xB6266E4Fd8e161A702c3c87fDC67C418bF941D90",
    "0xad08767a27bdbfE65d1D84F2ea79fa62A3009E9F",
    "0xAdb85ce9ed1Ef9eB649D308Fc334c038e0CACE9E",
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