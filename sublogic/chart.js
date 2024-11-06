// Function to render wallet value chart using Chart.js
export function renderWalletValueChart(valuesUSD) {
  const ctx = document.getElementById("walletValueChart").getContext("2d");

  const walletData = {
    labels: ["Mainnet", "Base", "Arbitrum"],
    datasets: [
      {
        label: "Wallet Value in USD",
        data: [
          valuesUSD.ethMainnetUSD,
          valuesUSD.baseUSD,
          valuesUSD.arbitrumUSD,
        ],
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        fill: true,
      },
    ],
  };

  const config = {
    type: "line",
    data: walletData,
    options: {
      scales: {
        x: { title: { display: true, text: "Network" } },
        y: { title: { display: true, text: "Value (USD)" } },
      },
    },
  };

  new Chart(ctx, config);
}
