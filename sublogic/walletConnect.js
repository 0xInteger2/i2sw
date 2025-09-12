window.addEventListener("load", async () => {
  const connectButton = document.getElementById("connectButton");
  const walletCog = document.getElementById("walletCog");
  let infoVisible = false;
  let connectedAccount = null;

  if (!connectButton) {
    console.error("connectButton not found");
    return;
  }

  connectButton.style.cursor = "pointer";

  // --- Create wallet info window ---
  const infoWindow = document.createElement("div");
  infoWindow.style.position = "absolute";
  infoWindow.style.background = "#1e1e1e";
  infoWindow.style.color = "#fff";
  infoWindow.style.padding = "12px 16px";
  infoWindow.style.borderRadius = "8px";
  infoWindow.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
  infoWindow.style.fontSize = "14px";
  infoWindow.style.display = "none";
  infoWindow.style.zIndex = "1000";
  infoWindow.style.transform = "translateX(-100%)";
  infoWindow.style.minWidth = "250px";
  document.body.appendChild(infoWindow);

  const updateInfoWindowPosition = () => {
    const rect = connectButton.getBoundingClientRect();
    infoWindow.style.top = `${rect.bottom + 8 + window.scrollY}px`;
    infoWindow.style.left = `${rect.left + rect.width / 2 + window.scrollX}px`;
  };

  const truncateAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const getNetworkName = (chainIdHex) => {
    switch (parseInt(chainIdHex, 16)) {
      case 1:
        return "Ethereum Mainnet";
      case 5:
        return "Goerli Testnet";
      case 42161:
        return "Arbitrum One";
      case 0x12345:
        return "Sanko Network";
      default:
        return `Chain ${parseInt(chainIdHex, 16)}`;
    }
  };

  // --- Spin cog ---
  const spinCog = () => {
    if (!walletCog) return;
    walletCog.style.transition = "transform 1s linear";
    walletCog.style.transform = "rotate(180deg)";
    setTimeout(() => {
      walletCog.style.transition = "none";
      walletCog.style.transform = "rotate(0deg)";
    }, 800);
  };

  // --- Fetch ETH balance ---
  const getBalance = async (account) => {
    try {
      const balanceWei = await window.ethereum.request({
        method: "eth_getBalance",
        params: [account, "latest"],
      });
      return (parseInt(balanceWei, 16) / 1e18).toFixed(4);
    } catch {
      return "0.0000";
    }
  };

  // --- Update info window ---
  const updateInfoWindow = async (account) => {
    if (!window.ethereum || !account) {
      infoWindow.style.display = "none";
      infoVisible = false;
      return;
    }

    try {
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      const networkName = getNetworkName(chainId);
      const balanceEth = await getBalance(account);

      infoWindow.innerHTML = `
        <div><strong>Wallet:</strong> ${truncateAddress(account)}</div>
        <div><strong>Network:</strong> ${networkName}</div>
        <div><strong>ETH:</strong> ${balanceEth}</div>
      `;

      updateInfoWindowPosition();
      infoWindow.style.display = "block";
      infoVisible = true;
    } catch (err) {
      console.error(err);
      infoWindow.style.display = "none";
      infoVisible = false;
    }
  };

  // --- Update UI ---
  const updateUI = async (account) => {
    if (account) {
      connectedAccount = account;
      localStorage.setItem("connectedWallet", account);
      connectButton.style.color = "#05c46b";
      connectButton.title = `Connected: ${account}`;
      if (!infoVisible) await updateInfoWindow(account);
    } else {
      connectedAccount = null;
      connectButton.style.color = "#ff5e57";
      connectButton.title = "Connect Wallet";
      infoWindow.style.display = "none";
      infoVisible = false;
      localStorage.removeItem("connectedWallet");
    }
  };

  // --- Connect wallet ---
  const connectWallet = async () => {
    spinCog();

    if (connectedAccount) {
      infoWindow.style.display = infoVisible ? "none" : "block";
      infoVisible = !infoVisible;
      return;
    }

    if (window.ethereum && window.ethereum.isMetaMask) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        if (accounts.length > 0) await updateUI(accounts[0]);
      } catch (err) {
        console.error("User rejected request:", err);
        await updateUI(null);
      }
    } else {
      alert("MetaMask not found! Install it first.");
      await updateUI(null);
    }
  };

  connectButton.addEventListener("click", connectWallet);

  // --- Initialize ---
  if (window.ethereum && window.ethereum.isMetaMask) {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (accounts.length > 0) await updateUI(accounts[0]);
  }

  // --- Handle account/network changes dynamically ---
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", async (accounts) => {
      if (accounts.length > 0) await updateUI(accounts[0]);
      else await updateUI(null);
    });
    window.ethereum.on("chainChanged", async () => {
      if (connectedAccount) await updateInfoWindow(connectedAccount);
    });
  }

  // --- Update position on scroll/resize ---
  window.addEventListener("resize", updateInfoWindowPosition);
  window.addEventListener("scroll", updateInfoWindowPosition);

  // --- Hide info window when clicking outside ---
  document.addEventListener("click", (event) => {
    const isClickInsideButton = connectButton.contains(event.target);
    const isClickInsideWindow = infoWindow.contains(event.target);

    if (!isClickInsideButton && !isClickInsideWindow && infoVisible) {
      infoWindow.style.display = "none";
      infoVisible = false;
    }
  });
});
