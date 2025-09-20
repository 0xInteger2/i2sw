/**
 * Standalone Mumu Collection Loader
 * Handles NFT collection loading using unified Web3Manager
 * Memory optimized - only loads recent blocks and caches metadata
 */

class MumuCollectionController {
  constructor() {
    this.web3Manager = null;
    this.isLoading = false;
    this.isInitialized = false;
    this.metadataCache = new Map();

    this.init();
  }

  async init() {
    try {
      // Wait for web3Manager to be available
      this.web3Manager = await this.waitForWeb3Manager();

      // Set up event listeners
      this.setupWeb3Listeners();

      // Initial UI update
      this.updateUI();

      this.isInitialized = true;
      console.log("Mumu Collection controller initialized");
    } catch (error) {
      console.error("Failed to initialize Mumu Collection controller:", error);
      this.showError("Failed to initialize collection functionality");
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

  setupWeb3Listeners() {
    if (this.web3Manager) {
      this.web3Manager.addEventListener("connected", () => {
        this.updateUI();
        // Auto-load collection if currently viewing collection section
        if (this.getCurrentSection() === "collection") {
          this.loadCollection();
        }
      });

      this.web3Manager.addEventListener("disconnected", () => {
        this.updateUI();
      });

      // Listen for refresh requests
      this.web3Manager.addEventListener("refresh:nft", () => {
        this.loadCollection();
      });
    }
  }

  getCurrentSection() {
    // Check which section is currently active
    const activeSection = document.querySelector(".mumu-section.active");
    if (activeSection && activeSection.id === "mumuCollection") {
      return "collection";
    }
    return "mint";
  }

  updateUI() {
    if (!this.web3Manager) return;

    const isConnected = this.web3Manager.isConnected();
    const walletAddressShort = document.getElementById(
      "mumuWalletAddressShort"
    );

    if (isConnected) {
      const shortAddress = this.web3Manager.getShortAddress();
      if (walletAddressShort) {
        walletAddressShort.textContent = shortAddress;
      }
    } else {
      if (walletAddressShort) {
        walletAddressShort.textContent = "-";
      }
      this.showDisconnectedState();
    }
  }

  showDisconnectedState() {
    const container = document.getElementById("mumuCollectionContainer");
    const stats = document.getElementById("mumuCollectionStats");

    if (stats) stats.style.display = "none";

    if (container) {
      container.innerHTML = `
        <div class="mumu-empty-state">
          <div class="mumu-empty-icon">🐮</div>
          <div class="mumu-empty-title">Connect Your Wallet</div>
          <div class="mumu-empty-text">
            Connect your wallet using the wallet button in the top navigation to view your Mumu Frens collection
          </div>
        </div>
      `;
    }
  }

  async loadCollection() {
    if (this.isLoading) return;
    this.isLoading = true;

    const container = document.getElementById("mumuCollectionContainer");

    if (!this.web3Manager?.isConnected()) {
      this.showDisconnectedState();
      this.isLoading = false;
      return;
    }

    // Show loading state
    if (container) {
      container.innerHTML = `
        <div class="mumu-loading">
          <div class="mumu-spinner"></div>
          <h3>Loading your Mumu Frens...</h3>
          <p>This may take a moment</p>
        </div>
      `;
    }

    try {
      this.showStatus("Fetching your NFT balance...", "info");

      // Get balance using web3Manager
      const balance = await this.web3Manager.getMumuFrensBalance();

      const totalNfts = document.getElementById("mumuTotalNfts");
      const collectionStats = document.getElementById("mumuCollectionStats");

      if (totalNfts) totalNfts.textContent = balance.toString();
      if (collectionStats) collectionStats.style.display = "block";

      if (balance === 0) {
        this.showEmptyCollection();
        this.isLoading = false;
        return;
      }

      this.showStatus("Fetching your NFTs from the blockchain...", "info");

      // Use optimized token fetching from web3Manager
      const ownedTokens = await this.web3Manager.getMumuFrensTokens();

      if (ownedTokens.length === 0) {
        this.showNoCurrentNFTs();
        this.isLoading = false;
        return;
      }

      // Update actual count (might be different from balance due to recent transfers)
      if (totalNfts) totalNfts.textContent = ownedTokens.length;

      // Display the NFTs
      await this.displayNFTs(ownedTokens);

      this.clearStatus();
      console.log(`Loaded ${ownedTokens.length} Mumu Frens successfully`);
    } catch (error) {
      console.error("Error loading collection:", error);
      this.showErrorState();
      this.showStatus(
        "Error loading your collection. Please try again.",
        "error"
      );
    } finally {
      this.isLoading = false;
    }
  }

  showEmptyCollection() {
    const container = document.getElementById("mumuCollectionContainer");
    if (container) {
      container.innerHTML = `
        <div class="mumu-empty-state">
          <div class="mumu-empty-icon">🐮</div>
          <div class="mumu-empty-title">No Mumu Frens Yet</div>
          <div class="mumu-empty-text">
            You don't own any Mumu Frens NFTs yet. Switch to the Mint tab to get started!
          </div>
        </div>
      `;
    }
  }

  showNoCurrentNFTs() {
    const container = document.getElementById("mumuCollectionContainer");
    if (container) {
      container.innerHTML = `
        <div class="mumu-empty-state">
          <div class="mumu-empty-icon">🐮</div>
          <div class="mumu-empty-title">No Current NFTs</div>
          <div class="mumu-empty-text">
            You may have transferred your Mumu Frens to another wallet.
          </div>
        </div>
      `;
    }
  }

  showErrorState() {
    const container = document.getElementById("mumuCollectionContainer");
    if (container) {
      container.innerHTML = `
        <div class="mumu-empty-state">
          <div class="mumu-empty-icon">❌</div>
          <div class="mumu-empty-title">Error Loading Collection</div>
          <div class="mumu-empty-text">
            There was an error fetching your NFTs. This might be due to network issues.
          </div>
          <button class="mumu-connect-btn" onclick="mumuCollectionController.loadCollection()">
            Try Again
          </button>
        </div>
      `;
    }
  }

  async displayNFTs(tokenIds) {
    const container = document.getElementById("mumuCollectionContainer");
    if (!container) return;

    container.innerHTML =
      '<div class="mumu-collection-grid" id="mumuNftGrid"></div>';
    const grid = document.getElementById("mumuNftGrid");

    // Create cards for each token
    for (const tokenId of tokenIds) {
      const nftCard = await this.createNFTCard(tokenId);
      if (grid && nftCard) {
        grid.appendChild(nftCard);
      }
    }
  }

  async createNFTCard(tokenId) {
    const card = document.createElement("div");
    card.className = "mumu-nft-card";

    // Set initial card HTML
    card.innerHTML = `
      <div class="mumu-nft-image">🐮 #${tokenId}</div>
      <div class="mumu-nft-title">Mumu Fren #${tokenId}</div>
      <div class="mumu-nft-id">Token ID: ${tokenId}</div>
      <div class="mumu-nft-links">
        <a href="https://etherscan.io/nft/0xC388e31d7a85F59a18E4D3bCE52f531F5ebA1567/${tokenId}" 
           target="_blank" class="mumu-nft-link">
          Etherscan
        </a>
        <a href="https://opensea.io/assets/ethereum/0xC388e31d7a85F59a18E4D3bCE52f531F5ebA1567/${tokenId}" 
           target="_blank" class="mumu-nft-link">
          OpenSea
        </a>
      </div>
    `;

    // Load metadata asynchronously using web3Manager (with caching)
    this.loadNFTMetadata(tokenId, card);

    return card;
  }

  async loadNFTMetadata(tokenId, card) {
    try {
      // Use web3Manager to get metadata (includes caching)
      const nftData = await this.web3Manager.getNFTMetadata(tokenId);

      // Add message if it exists
      if (nftData.message) {
        const messageDiv = document.createElement("div");
        messageDiv.className = "mumu-nft-message";
        messageDiv.textContent = nftData.message;
        card.insertBefore(messageDiv, card.querySelector(".mumu-nft-links"));
      }

      // Add metadata link if it exists
      if (nftData.tokenURI) {
        const metadataLink = document.createElement("a");
        metadataLink.href = nftData.tokenURI;
        metadataLink.target = "_blank";
        metadataLink.className = "mumu-nft-link";
        metadataLink.textContent = "Metadata";
        card.querySelector(".mumu-nft-links").appendChild(metadataLink);
      }

      // Add image if metadata contains one
      if (nftData.metadata?.image) {
        const img = document.createElement("img");
        img.src = nftData.metadata.image.replace(
          "ipfs://",
          "https://ipfs.io/ipfs/"
        );
        img.onerror = () => {
          // If image fails to load, keep the emoji
          console.log(`Failed to load image for token ${tokenId}`);
        };
        img.onload = () => {
          const imageContainer = card.querySelector(".mumu-nft-image");
          if (imageContainer) {
            imageContainer.innerHTML = "";
            imageContainer.appendChild(img);
          }
        };
      }
    } catch (error) {
      console.log(`Could not load enhanced data for token ${tokenId}:`, error);
    }
  }

  showStatus(message, type) {
    const statusDiv = document.getElementById("mumuCollectionStatus");
    if (!statusDiv) return;

    statusDiv.className = `mumu-status ${type}`;
    statusDiv.textContent = message;

    // Auto-clear success and error messages
    if (type === "success" || type === "error") {
      setTimeout(() => {
        this.clearStatus();
      }, 8000);
    }
  }

  clearStatus() {
    const statusDiv = document.getElementById("mumuCollectionStatus");
    if (statusDiv) {
      statusDiv.textContent = "";
      statusDiv.className = "mumu-status";
    }
  }

  showError(message) {
    this.showStatus(message, "error");
  }

  // Public methods for external access
  isReady() {
    return this.isInitialized && this.web3Manager?.isConnected();
  }

  refresh() {
    if (this.getCurrentSection() === "collection") {
      this.loadCollection();
    }
  }

  // Force refresh from external source
  forceRefresh() {
    this.metadataCache.clear(); // Clear metadata cache
    this.loadCollection();
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Only initialize if the mumu container exists
  if (document.getElementById("mumuContainer")) {
    window.mumuCollectionController = new MumuCollectionController();
  }
});

// Export for potential module usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = MumuCollectionController;
}
