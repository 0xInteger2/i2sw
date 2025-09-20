/**
 * Simplified Whirlpool Component - Uses Web3Manager
 * Handles only UI updates and user interactions
 */

window.addEventListener("DOMContentLoaded", async () => {
  let isLoading = false;

  // Wait for web3Manager
  if (!window.web3Manager) {
    console.error("Web3Manager not found");
    return;
  }

  // Set up event listeners
  window.web3Manager.addEventListener("connected", loadWhirlpoolData);
  window.web3Manager.addEventListener("disconnected", resetUI);
  window.web3Manager.addEventListener("initialized", () => {
    if (window.web3Manager.isConnected()) {
      loadWhirlpoolData();
    }
  });

  // Set up auto-refresh
  window.web3Manager.addEventListener("refresh:whirlpool", loadWhirlpoolData);
  window.web3Manager.startAutoRefresh("whirlpool", 30000);

  // Set up button event listeners
  setupButtons();

  function setupButtons() {
    const stakeBtn = document.getElementById("stakeBtn");
    const withdrawBtn = document.getElementById("withdrawBtn");
    const claimBtn = document.getElementById("claimBtn");

    if (stakeBtn) stakeBtn.onclick = stakeTokens;
    if (withdrawBtn) withdrawBtn.onclick = withdrawTokens;
    if (claimBtn) claimBtn.onclick = claimRewards;
  }

  function updateElementIfExists(id, value) {
    const element = document.getElementById(id);
    if (element) {
      if (element.classList.contains("loading")) {
        element.classList.remove("loading");
      }
      element.innerText = value;
    }
  }

  function showTxStatus(message, isError = false) {
    if (isError) {
      alert("Error: " + message);
    } else {
      alert(message);
    }
  }

  async function loadWhirlpoolData() {
    if (isLoading) return;
    isLoading = true;

    try {
      console.log("Loading whirlpool data...");

      if (!window.web3Manager.isConnected()) {
        resetUI();
        return;
      }

      // Update user address display
      updateElementIfExists(
        "userAddress",
        window.web3Manager.getShortAddress()
      );

      // Load user portfolio data
      const userInfo = await window.web3Manager.getWhirlpoolUserInfo();
      if (userInfo) {
        updateElementIfExists(
          "surfBalance",
          parseFloat(userInfo.surfBalance).toFixed(6)
        );
        updateElementIfExists(
          "stakedLP",
          parseFloat(userInfo.staked).toFixed(6)
        );
        updateElementIfExists(
          "pendingSURF",
          parseFloat(userInfo.pendingRewards).toFixed(6)
        );
        updateElementIfExists(
          "claimed",
          parseFloat(userInfo.claimed).toFixed(6)
        );

        // Update contract status
        const contractStatus = document.getElementById("contractStatus");
        if (contractStatus) {
          if (userInfo.isActive) {
            contractStatus.innerText = "Contract Active ✅";
            contractStatus.className = "status-badge status-active";
          } else {
            contractStatus.innerText = "Contract Inactive ❌";
            contractStatus.className = "status-badge status-inactive";
          }
        }
      }

      // Load pool statistics
      const poolStats = await window.web3Manager.getWhirlpoolStats();
      if (poolStats) {
        const totalStakedAmount = parseFloat(poolStats.totalStaked);
        updateElementIfExists("totalStaked", totalStakedAmount.toFixed(6));
        updateElementIfExists(
          "totalPending",
          parseFloat(poolStats.totalPending).toFixed(6)
        );

        // Calculate USD value
        const totalStakedUSDElement = document.getElementById("totalStakedUSD");
        if (totalStakedUSDElement && totalStakedAmount > 0) {
          try {
            console.log("Fetching LP price for USD calculation...");
            const lpPrice = await window.web3Manager.getLPTokenPrice();
            const totalUSDValue = totalStakedAmount * lpPrice;

            totalStakedUSDElement.innerText = `${totalUSDValue.toLocaleString(
              "en-US",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}`;

            console.log("LP price calculation:", {
              totalStakedAmount,
              lpPrice: lpPrice.toFixed(6),
              totalUSDValue: totalUSDValue.toFixed(2),
            });
          } catch (priceError) {
            console.warn("Could not fetch LP price:", priceError);
            totalStakedUSDElement.innerText = "Price unavailable";
          }
        } else if (totalStakedUSDElement) {
          totalStakedUSDElement.innerText = "$0.00";
        }
      }

      console.log("Whirlpool data loaded successfully");
    } catch (err) {
      console.error("Error loading whirlpool data:", err);

      // Update UI to show error for existing loading elements
      document.querySelectorAll(".loading").forEach((el) => {
        el.innerText = "Error";
        el.style.color = "red";
      });
    } finally {
      isLoading = false;
    }
  }

  function resetUI() {
    updateElementIfExists("userAddress", "Not Connected");
    updateElementIfExists("surfBalance", "Loading...");
    updateElementIfExists("stakedLP", "Loading...");
    updateElementIfExists("pendingSURF", "Loading...");
    updateElementIfExists("claimed", "Loading...");
    updateElementIfExists("totalStaked", "Loading...");
    updateElementIfExists("totalStakedUSD", "Loading USD...");
    updateElementIfExists("totalPending", "Loading...");

    const contractStatus = document.getElementById("contractStatus");
    if (contractStatus) {
      contractStatus.innerText = "Contract Inactive";
      contractStatus.className = "status-badge status-inactive";
    }
  }

  async function stakeTokens() {
    try {
      const amount = document.getElementById("stakeAmount").value;
      if (!amount || parseFloat(amount) <= 0) {
        showTxStatus("Please enter a valid amount to stake", true);
        return;
      }

      if (!window.web3Manager.isConnected()) {
        showTxStatus("Please connect your wallet first", true);
        return;
      }

      showTxStatus("Processing stake transaction...");

      const receipt = await window.web3Manager.stakeTokens(amount);
      showTxStatus("Staking successful!");

      // Clear input and refresh
      document.getElementById("stakeAmount").value = "";
      await loadWhirlpoolData();
    } catch (err) {
      console.error("Stake error:", err);
      showTxStatus(err.reason || err.message || "Transaction failed", true);
    }
  }

  async function withdrawTokens() {
    try {
      const amount = document.getElementById("withdrawAmount").value;
      if (!amount || parseFloat(amount) <= 0) {
        showTxStatus("Please enter a valid amount to withdraw", true);
        return;
      }

      if (!window.web3Manager.isConnected()) {
        showTxStatus("Please connect your wallet first", true);
        return;
      }

      showTxStatus("Processing withdraw transaction...");

      const receipt = await window.web3Manager.withdrawTokens(amount);
      showTxStatus("Withdrawal successful!");

      // Clear input and refresh
      document.getElementById("withdrawAmount").value = "";
      await loadWhirlpoolData();
    } catch (err) {
      console.error("Withdraw error:", err);
      showTxStatus(err.reason || err.message || "Transaction failed", true);
    }
  }

  async function claimRewards() {
    try {
      if (!window.web3Manager.isConnected()) {
        showTxStatus("Please connect your wallet first", true);
        return;
      }

      showTxStatus("Processing claim transaction...");

      const receipt = await window.web3Manager.claimRewards();
      showTxStatus("Rewards claimed successfully!");

      await loadWhirlpoolData();
    } catch (err) {
      console.error("Claim error:", err);
      showTxStatus(err.reason || err.message || "Transaction failed", true);
    }
  }

  // Initial load if already connected
  if (window.web3Manager.isConnected()) {
    loadWhirlpoolData();
  }
});
