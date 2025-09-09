document.addEventListener("DOMContentLoaded", () => {
  const connectButton = document.getElementById("connectButton");

  async function connectWallet() {
    if (typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        const account = accounts[0];
        walletAddress.textContent = `Connected: ${account}`;
      } catch (err) {
        console.error("User rejected request", err);
      }
    } else {
      alert("MetaMask not found! Please install or enable it.");
    }
  }

  connectButton.addEventListener("click", connectWallet);
});
