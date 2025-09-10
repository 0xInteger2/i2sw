// walletConnect.js
window.addEventListener("load", () => {
  const connectButton = document.getElementById("connectButton");

  if (!connectButton) {
    console.error("connectButton not found");
    return;
  }

  connectButton.style.cursor = "pointer";

  connectButton.addEventListener("click", async () => {
    if (typeof window.ethereum === "undefined") {
      alert("MetaMask not found! Install it first.");
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const account = accounts[0];
      console.log("Connected account:", account);
      connectButton.style.color = "green";
      connectButton.title = `Connected: ${account}`;
      alert(`Connected: ${account}`);
    } catch (err) {
      console.error("User rejected request:", err);
      alert("Connection rejected");
    }
  });
});
