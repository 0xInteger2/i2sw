import { ethers } from "ethers";
import factoryArtifact from "../artifacts/contracts/HarpoonFactory.sol/HarpoonFactory.json" assert { type: "json" };
import harpoonArtifact from "../artifacts/contracts/Harpoon.sol/Harpoon.json" assert { type: "json" };

// ⚡ Your Hardhat localhost RPC
const RPC_URL = "http://127.0.0.1:8545";

// ⚡ Replace with the deployed factory address
const FACTORY_ADDRESS = "0x0165878A594ca255338adfa4d48449f69242Eb8F";

async function main() {
  // Connect to local Hardhat node
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // ✅ ethers v6: create signer from a known private key or funded account
  // Hardhat default first account private key:
  const defaultKey =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const signer = new ethers.Wallet(defaultKey, provider);

  // Instantiate the factory
  const factory = new ethers.Contract(
    FACTORY_ADDRESS,
    factoryArtifact.abi,
    signer
  );

  let count: bigint;
  try {
    // Preferred function if available
    count = await factory.harpoonCount();
  } catch {
    try {
      count = await factory.totalHarpoons();
    } catch {
      throw new Error("Factory contract does not expose harpoonCount/totalHarpoons");
    }
  }

  console.log(`🔎 Total Harpoons: ${count}`);

  for (let i = 0n; i < count; i++) {
    let harpoonAddr: string;
    try {
      harpoonAddr = await factory.harpoons(i);
    } catch {
      harpoonAddr = await factory.allHarpoons(i);
    }
    console.log(`\n📍 Harpoon[${i}] at: ${harpoonAddr}`);

    const harpoon = new ethers.Contract(
      harpoonAddr,
      harpoonArtifact.abi,
      signer
    );

    try {
      const details = await harpoon.getPositionDetails();
      console.log("   ➡️ Position Details:", details);
    } catch (err) {
      console.log("   ⚠️ Could not read details:", (err as Error).message);
    }
  }
}

main().catch((err) => {
  console.error("❌ Error running readHarpoon:", err);
  process.exit(1);
});
