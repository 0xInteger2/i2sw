// Function to fetch ETH price on a specific date from CoinGecko
export async function getEthPriceOnDate(date) {
  const url = `https://api.coingecko.com/api/v3/coins/ethereum/history?date=${date}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.market_data.current_price.usd; // Returns price in USD
}

// Function to convert ETH balances to USD
export function convertBalancesToUSD(balances, ethPrice) {
  return {
    ethMainnetUSD: balances.ethMainnet * ethPrice,
    baseUSD: balances.base * ethPrice,
    arbitrumUSD: balances.arbitrum * ethPrice,
  };
}
