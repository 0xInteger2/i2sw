/**
 * Simplified SURF Price Widget - Uses Web3Manager
 * Delegates price fetching to manager, handles only UI updates
 */

class SurfPriceWidget {
  constructor() {
    console.log("Initializing SURF Price Widget...");

    this.loading = false;
    this.initializeElements();
    this.bindEvents();

    // Wait for web3Manager and set up listeners
    this.setupWeb3ManagerListeners();
    this.fetchPrices();
  }

  initializeElements() {
    this.elements = {
      refreshBtn: document.getElementById("refresh-btn"),
      refreshIcon: document.getElementById("refresh-icon"),
      errorMessage: document.getElementById("error-message"),
      errorText: document.getElementById("error-text"),
      surfPrice: document.getElementById("surf-price"),
      surfEthRatio: document.getElementById("surf-eth-ratio"),
      ethPrice: document.getElementById("eth-price"),
      lpPrice: document.getElementById("lp-price"),
      lastUpdated: document.getElementById("last-updated"),
    };
  }

  bindEvents() {
    if (this.elements.refreshBtn) {
      this.elements.refreshBtn.addEventListener("click", () => {
        this.fetchPrices();
      });
    }
  }

  setupWeb3ManagerListeners() {
    if (!window.web3Manager) {
      console.warn("Web3Manager not available, retrying...");
      setTimeout(() => this.setupWeb3ManagerListeners(), 1000);
      return;
    }

    // Listen for refresh events
    window.web3Manager.addEventListener("refresh:prices", () => {
      this.fetchPrices();
    });

    // Start auto-refresh for prices (every 5 minutes)
    window.web3Manager.startAutoRefresh("prices", 5 * 60 * 1000);
  }

  setLoading(loading) {
    this.loading = loading;
    if (this.elements.refreshBtn) {
      this.elements.refreshBtn.disabled = loading;
    }

    if (this.elements.refreshIcon) {
      if (loading) {
        this.elements.refreshIcon.style.animation = "spin 1s linear infinite";
      } else {
        this.elements.refreshIcon.style.animation = "none";
      }
    }
  }

  showError(message) {
    if (this.elements.errorText) {
      this.elements.errorText.textContent = message;
    }
    if (this.elements.errorMessage) {
      this.elements.errorMessage.classList.remove("hidden");
      this.elements.errorMessage.style.display = "flex";
    }
  }

  hideError() {
    if (this.elements.errorMessage) {
      this.elements.errorMessage.classList.add("hidden");
    }
  }

  async fetchPrices() {
    if (!window.web3Manager) {
      this.showError("Web3Manager not available");
      return;
    }

    this.setLoading(true);
    this.hideError();

    try {
      console.log("Fetching price data from Web3Manager...");

      // Get prices from the unified manager
      const [ethPriceUSD, surfData] = await Promise.all([
        window.web3Manager.getETHPrice(),
        window.web3Manager.getSurfPrice(),
      ]);

      console.log("Price data received:", { ethPriceUSD, surfData });

      // Calculate LP price estimate
      const lpPrice = this.estimateLPPrice(surfData.usd, ethPriceUSD);

      const priceData = {
        surfPriceUSD: surfData.usd,
        ethPriceUSD: ethPriceUSD,
        surfEthRatio: surfData.eth || surfData.usd / ethPriceUSD,
        lpPrice: lpPrice,
      };

      this.updateUI(priceData);
      this.updateLastUpdated();
    } catch (error) {
      console.error("Error fetching prices:", error);
      this.showError("Failed to fetch price data. Please try again.");
    } finally {
      this.setLoading(false);
    }
  }

  estimateLPPrice(surfPriceUSD, ethPriceUSD) {
    // Simple LP price estimation
    if (!surfPriceUSD || surfPriceUSD <= 0) {
      return 1.5; // Fallback estimate
    }

    const estimatedSurfInPool = 100000;
    const estimatedETHInPool =
      (estimatedSurfInPool * surfPriceUSD) / ethPriceUSD;
    const totalPoolValueUSD =
      estimatedSurfInPool * surfPriceUSD + estimatedETHInPool * ethPriceUSD;
    const estimatedLPSupply = 1000;

    return totalPoolValueUSD / estimatedLPSupply;
  }

  updateUI(data) {
    if (this.elements.surfPrice) {
      if (data.surfPriceUSD > 0) {
        this.elements.surfPrice.textContent = `$${data.surfPriceUSD.toFixed(
          6
        )}`;
      } else {
        this.elements.surfPrice.textContent = "N/A";
      }
    }

    if (this.elements.surfEthRatio) {
      if (data.surfEthRatio > 0) {
        this.elements.surfEthRatio.textContent = data.surfEthRatio.toFixed(8);
      } else {
        this.elements.surfEthRatio.textContent = "N/A";
      }
    }

    if (this.elements.ethPrice) {
      this.elements.ethPrice.textContent = `$${data.ethPriceUSD.toFixed(2)}`;
    }

    if (this.elements.lpPrice) {
      this.elements.lpPrice.textContent = `$${data.lpPrice.toFixed(6)}`;
    }
  }

  updateLastUpdated() {
    if (this.elements.lastUpdated) {
      const now = new Date();
      this.elements.lastUpdated.textContent = `Last updated: ${now.toLocaleTimeString()}`;
      this.elements.lastUpdated.classList.remove("hidden");
    }
  }

  // Cleanup method
  cleanup() {
    if (window.web3Manager) {
      window.web3Manager.stopAutoRefresh("prices");
    }
  }
}

// Initialize the widget when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing SURF price widget...");

  try {
    const widget = new SurfPriceWidget();
    window.surfWidget = widget;
    console.log("SURF price widget initialized successfully");

    // Cleanup on unload
    window.addEventListener("beforeunload", () => {
      if (window.surfWidget) {
        window.surfWidget.cleanup();
      }
    });
  } catch (error) {
    console.error("Failed to initialize SURF price widget:", error);
    const priceElement = document.getElementById("surf-price");
    if (priceElement) {
      priceElement.textContent = "Error loading";
    }
  }
});
