import axios from "axios";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import fs from "fs";

// === CONFIG === //
const API_KEY = "YOUR_MULTICHAIN_API_KEY"; // <-- replace with your Etherscan Multichain key
const CHECK_ADDRESS =
  "0x4DE7FEA447b837d7E77848a4B6C0662a64A84E14".toLowerCase();
const CHAIN_ID = 137; // Polygon Mainnet (use 80001 for Mumbai testnet)
// ============== //

async function fetchInteractors() {
  const url = `https://api.etherscan.io/v2/api
    ?chainid=${CHAIN_ID}
    &module=account
    &action=txlist
    &address=${CHECK_ADDRESS}
    &startblock=0
    &endblock=99999999
    &sort=asc
    &apikey=${API_KEY}`.replace(/\s+/g, "");

  const res = await axios.get(url);
  if (res.data.status !== "1") {
    console.error("❌ API Error:", res.data);
    return [];
  }

  const txs = res.data.result;
  const addresses = new Set();

  txs.forEach((tx) => {
    if (tx.from) addresses.add(tx.from.toLowerCase());
    if (tx.to) addresses.add(tx.to.toLowerCase());
  });

  return Array.from(addresses);
}

async function main() {
  const allowlist = await fetchInteractors();
  console.log("✅ Found", allowlist.length, "unique addresses");

  if (allowlist.length === 0) {
    console.log("⚠️ No addresses found, exiting.");
    return;
  }

  // Build Merkle tree
  const leaves = allowlist.map((addr) => keccak256(addr));
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const root = tree.getHexRoot();
  console.log("🌳 Merkle Root:", root);

  // Build proofs map
  const proofs = {};
  allowlist.forEach((addr) => {
    const leaf = keccak256(addr);
    proofs[addr] = tree.getHexProof(leaf);
  });

  // Save outputs
  fs.writeFileSync("merkleRoot.txt", root);
  fs.writeFileSync("proofs.json", JSON.stringify(proofs, null, 2));

  console.log("📁 Wrote merkleRoot.txt and proofs.json");
}

main().catch((err) => {
  console.error("💥 Script failed:", err);
});
