document.addEventListener("DOMContentLoaded", () => {
  const connectButton = document.getElementById("connectButton");
  const walletAddress = document.getElementById("walletAddress");

  // Initially red if no wallet is connected
  connectButton.style.color = "#ff5e57";

  async function connectWallet() {
    if (typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        const account = accounts[0];
        walletAddress.textContent = `Connected: ${account}`;

        // Change button color to green when connected
        connectButton.style.color = "#05c46b";
      } catch (err) {
        console.error("User rejected request", err);
        // Keep button red if connection fails
        connectButton.style.color = "#ff5e57";
      }
    } else {
      alert("MetaMask not found! Please install or enable it.");
      connectButton.style.color = "red";
    }
  }

  connectButton.addEventListener("click", connectWallet);
});
