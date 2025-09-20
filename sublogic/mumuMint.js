/**
 * Standalone Mumu Mint Component
 * Handles minting functionality using unified Web3Manager
 */

class MumuMintController {
  constructor() {
    this.web3Manager = null;
    this.currentSection = "mint";
    this.isInitialized = false;

    this.init();
  }

  async init() {
    try {
      // Wait for web3Manager to be available
      this.web3Manager = await this.waitForWeb3Manager();

      // Set up event listeners
      this.setupEventListeners();
      this.setupWeb3Listeners();

      // Initial UI update
      this.updateUI();
      this.updateTotalCost();

      this.isInitialized = true;
      console.log("Mumu Mint controller initialized");
    } catch (error) {
      console.error("Failed to initialize Mumu Mint controller:", error);
      this.showError("Failed to initialize minting functionality");
    }
  }

  waitForWeb3Manager() {
    return new Promise((resolve) => {
      const checkManager = () => {
        if (window.web3Manager && window.web3Manager.isInitialized) {
          resolve(window.web3Manager);
        } else {
          setTimeout(checkManager, 100);
        }
      };
      checkManager();
    });
  }

  setupEventListeners() {
    // Navigation tabs
    document.querySelectorAll(".mumu-nav-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const section = e.target.getAttribute("data-section");
        this.showSection(section);
      });
    });

    // Quantity controls
    const qtyDown = document.getElementById("mumuQtyDown");
    const qtyUp = document.getElementById("mumuQtyUp");
    const mintBtn = document.getElementById("mumuMintBtn");

    if (qtyDown) {
      qtyDown.addEventListener("click", () => this.changeQuantity(-1));
    }

    if (qtyUp) {
      qtyUp.addEventListener("click", () => this.changeQuantity(1));
    }

    if (mintBtn) {
      mintBtn.addEventListener("click", () => this.mint());
    }

    // Quantity input changes
    const quantityInput = document.getElementById("mumuQuantity");
    if (quantityInput) {
      quantityInput.addEventListener("change", () => this.updateTotalCost());
    }
  }

  setupWeb3Listeners() {
    if (this.web3Manager) {
      this.web3Manager.addEventListener("connected", () => this.updateUI());
      this.web3Manager.addEventListener("disconnected", () => this.updateUI());
    }
  }

  showSection(sectionName) {
    // Update navigation
    document.querySelectorAll(".mumu-nav-tab").forEach((tab) => {
      tab.classList.remove("active");
    });
    document.querySelectorAll(".mumu-section").forEach((section) => {
      section.classList.remove("active");
    });

    // Activate selected tab and section
    const activeTab = document.querySelector(`[data-section="${sectionName}"]`);
    const activeSection = document.getElementById(
      `mumu${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}`
    );

    if (activeTab) activeTab.classList.add("active");
    if (activeSection) activeSection.classList.add("active");

    this.currentSection = sectionName;

    // Trigger collection load if switching to collection and wallet is connected
    if (sectionName === "collection" && this.web3Manager?.isConnected()) {
      // Trigger collection loading (handled by loadMumus.js)
      if (window.mumuCollectionController) {
        window.mumuCollectionController.loadCollection();
      }
    }
  }

  changeQuantity(delta) {
    const input = document.getElementById("mumuQuantity");
    if (!input) return;

    const current = parseInt(input.value);
    const newValue = Math.max(1, Math.min(10, current + delta));
    input.value = newValue;
    this.updateTotalCost();

    // Update button states
    const qtyDown = document.getElementById("mumuQtyDown");
    const qtyUp = document.getElementById("mumuQtyUp");

    if (qtyDown) qtyDown.disabled = newValue <= 1;
    if (qtyUp) qtyUp.disabled = newValue >= 10;
  }

  updateTotalCost() {
    const quantityInput = document.getElementById("mumuQuantity");
    const totalCostElement = document.getElementById("mumuTotalCost");

    if (!quantityInput || !totalCostElement) return;

    const quantity = parseInt(quantityInput.value) || 1;
    const total = (quantity * 0.005).toFixed(3);
    totalCostElement.textContent = `${total} ETH`;
  }

  updateUI() {
    if (!this.web3Manager) return;

    const isConnected = this.web3Manager.isConnected();

    // Get UI elements
    const walletPrompt = document.getElementById("mumuWalletPrompt");
    const walletInfo = document.getElementById("mumuWalletInfo");
    const mintBtn = document.getElementById("mumuMintBtn");
    const walletAddress = document.getElementById("mumuWalletAddress");

    if (isConnected) {
      const shortAddress = this.web3Manager.getShortAddress();

      // Show connected state
      if (walletPrompt) walletPrompt.style.display = "none";
      if (walletInfo) walletInfo.style.display = "block";
      if (mintBtn) mintBtn.style.display = "block";
      if (walletAddress) walletAddress.textContent = shortAddress;
    } else {
      // Show disconnected state
      if (walletPrompt) walletPrompt.style.display = "block";
      if (walletInfo) walletInfo.style.display = "none";
      if (mintBtn) mintBtn.style.display = "none";
    }
  }

  async mint() {
    if (!this.web3Manager?.isConnected()) {
      this.showStatus("Please connect your wallet first", "error");
      return;
    }

    const quantityInput = document.getElementById("mumuQuantity");
    const mintBtn = document.getElementById("mumuMintBtn");

    if (!quantityInput) {
      this.showStatus("Quantity input not found", "error");
      return;
    }

    const quantity = parseInt(quantityInput.value);

    if (!quantity || quantity < 1 || quantity > 10) {
      this.showStatus("Please enter a valid quantity (1-10)", "error");
      return;
    }

    try {
      // Update button state
      if (mintBtn) {
        mintBtn.disabled = true;
        mintBtn.innerHTML = '<span class="mumu-spinner"></span> Minting...';
      }

      this.showStatus(
        `Sending transaction for ${quantity} NFT${quantity > 1 ? "s" : ""}...`,
        "info"
      );

      // Use web3Manager to mint
      const receipt = await this.web3Manager.mintMumuFrens(quantity);

      this.showStatus(
        `Transaction sent! Hash: ${receipt.transactionHash}`,
        "info"
      );

      this.showStatus(
        `Successfully minted ${quantity} Mumu Fren${
          quantity > 1 ? "s" : ""
        }! 🎉`,
        "success"
      );

      // Reset quantity to 1
      if (quantityInput) {
        quantityInput.value = 1;
        this.updateTotalCost();
      }

      // Refresh collection if user is viewing it
      if (
        this.currentSection === "collection" &&
        window.mumuCollectionController
      ) {
        setTimeout(() => {
          window.mumuCollectionController.loadCollection();
        }, 2000);
      }
    } catch (error) {
      console.error("Mint error:", error);

      if (error.code === 4001) {
        this.showStatus("Transaction cancelled by user", "error");
      } else if (
        error.message &&
        error.message.includes("insufficient funds")
      ) {
        this.showStatus("Insufficient funds for transaction", "error");
      } else {
        this.showStatus(
          `Mint failed: ${error.reason || error.message || "Unknown error"}`,
          "error"
        );
      }
    } finally {
      // Reset button state
      if (mintBtn) {
        mintBtn.disabled = false;
        mintBtn.textContent = "Mint Mumu Fren";
      }
    }
  }

  showStatus(message, type) {
    const statusDiv = document.getElementById("mumuMintStatus");
    if (!statusDiv) return;

    statusDiv.className = `mumu-status ${type}`;
    statusDiv.textContent = message;

    // Auto-clear success and error messages
    if (type === "success" || type === "error") {
      setTimeout(() => {
        statusDiv.textContent = "";
        statusDiv.className = "mumu-status";
      }, 8000);
    }
  }

  showError(message) {
    this.showStatus(message, "error");
  }

  // Public methods for external access
  getCurrentSection() {
    return this.currentSection;
  }

  isReady() {
    return this.isInitialized && this.web3Manager?.isConnected();
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Only initialize if the mumu container exists
  if (document.getElementById("mumuContainer")) {
    window.mumuMintController = new MumuMintController();
  }
});

// Export for potential module usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = MumuMintController;
}
