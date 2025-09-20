/**
 * Simplified Wallet Connect - Uses Web3Manager
 * Handles only UI updates, delegates web3 functionality to manager
 */

window.addEventListener("load", async () => {
  const connectButton = document.getElementById("connectButton");
  const walletCog = document.getElementById("walletCog");
  let infoVisible = false;

  if (!connectButton) {
    console.error("connectButton not found");
    return;
  }

  connectButton.style.cursor = "pointer";

  // Wait for web3Manager to initialize
  if (!window.web3Manager) {
    console.error("Web3Manager not found");
    return;
  }

  // Create wallet info window
  const infoWindow = createInfoWindow();

  // Event listeners for web3Manager
  window.web3Manager.addEventListener("connected", handleWalletConnected);
  window.web3Manager.addEventListener("disconnected", handleWalletDisconnected);
  window.web3Manager.addEventListener("initialized", updateUI);

  // Initial UI update
  updateUI();

  function createInfoWindow() {
    const infoWindow = document.createElement("div");
    infoWindow.style.cssText = `
      position: absolute;
      background: #1e1e1e;
      color: #fff;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      font-size: 14px;
      display: none;
      z-index: 1000;
      transform: translateX(-100%);
      min-width: 250px;
    `;
    document.body.appendChild(infoWindow);

    // Disconnect button
    const disconnectButton = document.createElement("button");
    disconnectButton.textContent = "Disconnect";
    disconnectButton.style.cssText = `
      margin-top: 10px;
      background: #ff5e57;
      color: #fff;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      width: 100%;
    `;
    disconnectButton.addEventListener("click", () => {
      window.web3Manager.disconnect();
    });

    // Update position function
    const updatePosition = () => {
      const rect = connectButton.getBoundingClientRect();
      infoWindow.style.top = `${rect.bottom + 8 + window.scrollY}px`;
      infoWindow.style.left = `${
        rect.left + rect.width / 2 + window.scrollX
      }px`;
    };

    // Position listeners
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    // Hide on outside click
    document.addEventListener("click", (event) => {
      const isClickInsideButton = connectButton.contains(event.target);
      const isClickInsideWindow = infoWindow.contains(event.target);

      if (!isClickInsideButton && !isClickInsideWindow && infoVisible) {
        infoWindow.style.display = "none";
        infoVisible = false;
      }
    });

    return { element: infoWindow, updatePosition, disconnectButton };
  }

  function spinCog() {
    if (!walletCog) return;
    walletCog.style.transition = "transform 1s linear";
    walletCog.style.transform = "rotate(180deg)";
    setTimeout(() => {
      walletCog.style.transition = "none";
      walletCog.style.transform = "rotate(0deg)";
    }, 800);
  }

  async function updateInfoWindow() {
    if (!window.web3Manager.isConnected()) {
      infoWindow.element.style.display = "none";
      infoVisible = false;
      return;
    }

    try {
      const [balance, networkInfo] = await Promise.all([
        window.web3Manager.getBalance(),
        window.web3Manager.getNetworkInfo(),
      ]);

      const account = window.web3Manager.getAccount();
      const shortAddress = window.web3Manager.getShortAddress();

      infoWindow.element.innerHTML = `
        <div><strong>Wallet:</strong> ${shortAddress}</div>
        <div><strong>Network:</strong> ${networkInfo?.name || "Unknown"}</div>
        <div><strong>ETH:</strong> ${parseFloat(balance).toFixed(4)}</div>
      `;
      infoWindow.element.appendChild(infoWindow.disconnectButton);

      infoWindow.updatePosition();
      infoWindow.element.style.display = "block";
      infoVisible = true;
    } catch (err) {
      console.error("Error updating info window:", err);
      infoWindow.element.style.display = "none";
      infoVisible = false;
    }
  }

  function updateUI() {
    if (window.web3Manager.isConnected()) {
      const account = window.web3Manager.getAccount();
      connectButton.style.color = "#05c46b";
      connectButton.title = `Connected: ${account}`;
      if (!infoVisible) updateInfoWindow();
    } else {
      connectButton.style.color = "#ff5e57";
      connectButton.title = "Connect Wallet";
      infoWindow.element.style.display = "none";
      infoVisible = false;
    }
  }

  async function handleConnectClick() {
    spinCog();

    if (!window.web3Manager.isConnected()) {
      const result = await window.web3Manager.connect();
      if (!result.success) {
        if (!window.ethereum) {
          alert("MetaMask not found! Install it first.");
        } else {
          console.error("Connection failed:", result.error);
        }
      }
    } else {
      // Toggle info window if already connected
      infoWindow.element.style.display = infoVisible ? "none" : "block";
      infoVisible = !infoVisible;
    }
  }

  function handleWalletConnected(data) {
    updateUI();
  }

  function handleWalletDisconnected() {
    updateUI();
  }

  connectButton.addEventListener("click", handleConnectClick);
});
