class SurfPriceWidget {
  constructor() {
    console.log("Initializing SURF Price Widget...");

    this.loading = false;
    this.priceCache = { data: null, timestamp: 0 };

    this.initializeElements();
    this.bindEvents();
    this.fetchTokenPrice();
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
    this.elements.refreshBtn.addEventListener("click", () => {
      this.fetchTokenPrice();
    });
  }

  setLoading(loading) {
    this.loading = loading;
    this.elements.refreshBtn.disabled = loading;

    if (loading) {
      this.elements.refreshIcon.style.animation = "spin 1s linear infinite";
    } else {
      this.elements.refreshIcon.style.animation = "none";
    }
  }

  showError(message) {
    this.elements.errorText.textContent = message;
    this.elements.errorMessage.classList.remove("hidden");
    this.elements.errorMessage.style.display = "flex";
  }

  hideError() {
    this.elements.errorMessage.classList.add("hidden");
  }

  // Get ETH price from CoinGecko
  async getETHPrice() {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
      );
      const data = await response.json();
      return data.ethereum.usd;
    } catch (error) {
      console.error("Error fetching ETH price:", error);
      return 3000; // Fallback ETH price
    }
  }

  // Get SURF price from multiple sources
  async getSurfPrice() {
    // Try CoinGecko first
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=surf-finance&vs_currencies=usd,eth"
      );

      if (response.ok) {
        const data = await response.json();
        const surfData = data["surf-finance"];

        if (surfData && surfData.usd > 0) {
          console.log("Got SURF price from CoinGecko:", surfData);
          return {
            surfPriceUSD: surfData.usd,
            surfPriceETH: surfData.eth || 0,
          };
        }
      }
    } catch (error) {
      console.warn("CoinGecko API failed:", error);
    }

    // Try DexScreener API as backup
    try {
      const response = await fetch(
        "https://api.dexscreener.com/latest/dex/tokens/0xEa319e87Cf06203DAe107Dd8E5672175e3Ee976c"
      );

      if (response.ok) {
        const data = await response.json();

        if (data.pairs && data.pairs.length > 0) {
          const pair = data.pairs.find(
            (p) =>
              p.baseToken.address.toLowerCase() ===
              "0xea319e87cf06203dae107dd8e5672175e3ee976c"
          );

          if (pair && pair.priceUsd) {
            console.log("Got SURF price from DexScreener:", pair);
            return {
              surfPriceUSD: parseFloat(pair.priceUsd),
              surfPriceETH: parseFloat(pair.priceNative) || 0,
              lpData: pair,
            };
          }
        }
      }
    } catch (error) {
      console.warn("DexScreener API failed:", error);
    }

    return null;
  }

  async fetchTokenPrice() {
    // Check cache (5 minutes)
    if (
      this.priceCache.data &&
      Date.now() - this.priceCache.timestamp < 300000
    ) {
      console.log("Using cached price data");
      this.updateUI(this.priceCache.data);
      return;
    }

    this.setLoading(true);
    this.hideError();

    try {
      console.log("Fetching fresh price data...");

      // Get ETH price and SURF price in parallel
      const [ethPriceUSD, surfData] = await Promise.all([
        this.getETHPrice(),
        this.getSurfPrice(),
      ]);

      console.log("ETH Price:", ethPriceUSD);
      console.log("SURF Data:", surfData);

      let priceData;

      if (surfData && surfData.surfPriceUSD > 0) {
        // We have real price data
        const surfEthRatio =
          surfData.surfPriceETH || surfData.surfPriceUSD / ethPriceUSD;

        priceData = {
          surfPriceUSD: surfData.surfPriceUSD,
          ethPriceUSD: ethPriceUSD,
          surfEthRatio: surfEthRatio,
          lpPrice: this.estimateLPPrice(surfData.surfPriceUSD, ethPriceUSD),
        };
      } else {
        // Fallback to estimated values
        console.log("Using estimated values - no API data available");
        priceData = {
          surfPriceUSD: 0.0001, // Conservative estimate
          ethPriceUSD: ethPriceUSD,
          surfEthRatio: 0.0001 / ethPriceUSD,
          lpPrice: 1.5, // Estimated LP price
        };
      }

      // Cache the result
      this.priceCache = {
        data: priceData,
        timestamp: Date.now(),
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
    // Simple LP price estimation based on token prices
    // Assumes 50/50 pool with reasonable liquidity
    const estimatedSurfInPool = 100000; // Estimated SURF tokens
    const estimatedETHInPool =
      (estimatedSurfInPool * surfPriceUSD) / ethPriceUSD;

    const totalPoolValueUSD =
      estimatedSurfInPool * surfPriceUSD + estimatedETHInPool * ethPriceUSD;
    const estimatedLPSupply = 1000; // Estimated LP token supply

    return totalPoolValueUSD / estimatedLPSupply;
  }

  updateUI(data) {
    if (data.surfPriceUSD > 0) {
      this.elements.surfPrice.textContent = `$${data.surfPriceUSD.toFixed(6)}`;
      this.elements.surfEthRatio.textContent = data.surfEthRatio.toFixed(8);
    } else {
      this.elements.surfPrice.textContent = "N/A";
      this.elements.surfEthRatio.textContent = "N/A";
    }

    this.elements.ethPrice.textContent = `$${data.ethPriceUSD.toFixed(2)}`;
    this.elements.lpPrice.textContent = `$${data.lpPrice.toFixed(6)}`;
  }

  updateLastUpdated() {
    const now = new Date();
    this.elements.lastUpdated.textContent = `Last updated: ${now.toLocaleTimeString()}`;
    this.elements.lastUpdated.classList.remove("hidden");
  }
}

// Initialize the widget when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing widget...");

  try {
    const widget = new SurfPriceWidget();
    window.surfWidget = widget;
    console.log("Widget initialized successfully");
  } catch (error) {
    console.error("Failed to initialize widget:", error);
    document.getElementById("surf-price").textContent = "Error loading";
  }
});

// Auto-refresh every 5 minutes
setInterval(() => {
  if (window.surfWidget && !window.surfWidget.loading) {
    console.log("Auto-refreshing prices...");
    window.surfWidget.fetchTokenPrice();
  }
}, 5 * 60 * 1000);
