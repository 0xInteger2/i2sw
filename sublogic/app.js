import { resolveENS } from "./ens.js";
import { fetchBalances } from "./balanceFetcher.js";
import { getEthPriceOnDate, convertBalancesToUSD } from "./priceConverter.js";
import { renderWalletValueChart } from "./chart.js";

async function fetchAndDisplayData() {
  try {
    const ensName = "integer2.eth";
    const ethAddress = await resolveENS(ensName);

    // Fetch balances from multiple networks
    const balances = await fetchBalances(ethAddress);

    // Fetch ETH price on a specific date (example: 1st Sep 2023)
    const ethPrice = await getEthPriceOnDate("01-09-2023");

    // Convert balances to USD
    const valuesUSD = convertBalancesToUSD(balances, ethPrice);

    // Render the chart
    renderWalletValueChart(valuesUSD);
  } catch (error) {
    console.error("Error fetching data:", error);
  }
  console.log("ENS Address:", ethAddress);
  console.log("Mainnet Balance:", balances.ethMainnet);
  console.log("Base Balance:", balances.base);
  console.log("Arbitrum Balance:", balances.arbitrum);
  console.log("ETH Price in USD:", ethPrice);
  console.log("USD Values:", valuesUSD);
}

// Ensure fetchAndDisplayData runs after the page has loaded
window.addEventListener("DOMContentLoaded", fetchAndDisplayData);
