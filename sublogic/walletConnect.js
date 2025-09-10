// walletConnect.js
window.addEventListener("load", async () => {
  const connectButton = document.getElementById("connectButton");

  if (!connectButton) {
    console.error("connectButton not found");
    return;
  }

  connectButton.style.cursor = "pointer";

  // Update the icon color and tooltip
  const updateUI = (connected, account = "") => {
    connectButton.style.color = connected ? "#05c46b" : "#ff5e57"; // green/red
    connectButton.title = connected
      ? `Connected: ${account}`
      : "Connect Wallet";
  };

  // Check if wallet is already connected
  const checkWalletConnection = async () => {
    if (window.ethereum && window.ethereum.isMetaMask) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (accounts.length > 0) {
          updateUI(true, accounts[0]);
        } else {
          updateUI(false);
        }
      } catch (err) {
        console.error(err);
        updateUI(false);
      }
    } else {
      alert("MetaMask not found! Install it first.");
      updateUI(false);
    }
  };

  // Connect wallet on click
  const connectWallet = async () => {
    if (window.ethereum && window.ethereum.isMetaMask) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        updateUI(true, accounts[0]);
      } catch (err) {
        console.error("User rejected request:", err);
        updateUI(false);
      }
    } else {
      alert("MetaMask not found! Install it first.");
      updateUI(false);
    }
  };

  connectButton.addEventListener("click", connectWallet);

  // Run on page load
  await checkWalletConnection();

  // Handle account changes dynamically
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", (accounts) => {
      if (accounts.length > 0) {
        updateUI(true, accounts[0]);
      } else {
        updateUI(false);
      }
    });
  }
});
