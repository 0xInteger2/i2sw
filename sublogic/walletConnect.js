document.addEventListener("DOMContentLoaded", async () => {
  const connectButton = document.getElementById("connectButton");

  // Function to update icon color
  function updateIconColor(connected) {
    connectButton.style.color = connected ? "#05c46b" : "#ff5e57";
    connectButton.title = connected ? walletAddress : "Connect Wallet";
  }

  let walletAddress = "";

  // Check if wallet is already connected
  async function checkWalletConnection() {
    if (typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (accounts.length > 0) {
          walletAddress = accounts[0];
          updateIconColor(true);
        } else {
          updateIconColor(false);
        }
      } catch (err) {
        console.error(err);
        updateIconColor(false);
      }
    } else {
      alert("MetaMask not found! Please install or enable it.");
      updateIconColor(false);
    }
  }

  // Connect wallet on icon click
  async function connectWallet() {
    if (typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        walletAddress = accounts[0];
        updateIconColor(true);
      } catch (err) {
        console.error("User rejected request", err);
        updateIconColor(false);
      }
    } else {
      alert("MetaMask not found! Please install or enable it.");
      updateIconColor(false);
    }
  }

  connectButton.addEventListener("click", connectWallet);

  // Run on page load
  await checkWalletConnection();

  // Update if account changes
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", (accounts) => {
      if (accounts.length > 0) {
        walletAddress = accounts[0];
        updateIconColor(true);
      } else {
        walletAddress = "";
        updateIconColor(false);
      }
    });
  }
});
