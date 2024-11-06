import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.6.8/dist/ethers.esm.min.js";

// Function to fetch balance on a given network
export async function getBalanceOnNetwork(providerUrl, address) {
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const balance = await provider.getBalance(address);
  return ethers.utils.formatEther(balance); // Returns balance in ETH
}

// Function to fetch balances from all networks
export async function fetchBalances(address) {
  const ethMainnet = await getBalanceOnNetwork(
    "https://mainnet.infura.io/v3/7730164360884386b2484bca55846b8e",
    address
  );
  const base = await getBalanceOnNetwork(
    "https://base-mainnet.infura.io/v3/7730164360884386b2484bca55846b8e",
    address
  );
  const arbitrum = await getBalanceOnNetwork(
    "https://arbitrum-mainnet.infura.io/v3/7730164360884386b2484bca55846b8e",
    address
  );

  return { ethMainnet, base, arbitrum };
}
