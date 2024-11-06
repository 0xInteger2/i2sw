import { ethers } from "https://unpkg.com/ethers@5.6.8/dist/ethers.esm.min.js";

// Function to resolve ENS name to Ethereum address
export async function resolveENS(ensName) {
  const provider = new ethers.providers.JsonRpcProvider(
    "https://mainnet.infura.io/v3/7730164360884386b2484bca55846b8e"
  );
  const ens = new ethers.Contract(
    "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
    provider
  );
  const address = await provider.resolveName(ensName);
  return address;
}
