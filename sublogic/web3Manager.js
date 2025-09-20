/**
 * Unified Web3 Manager
 * Consolidates all blockchain functionality into a single manager
 * Reduces memory overhead and prevents duplicate instances
 */

class Web3Manager {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.userAccount = null;
    this.contracts = new Map();
    this.eventListeners = new Map();
    this.intervals = new Map();
    this.isInitialized = false;

    // Contract configurations
    this.contractConfigs = {
      whirlpool: {
        address: "0x999b1e6EDCb412b59ECF0C5e14c20948Ce81F40b",
        abi: [
          "function getAllInfoFor(address user) external view returns (bool isActive, uint256[12] info)",
          "function userInfo(address) external view returns (uint256 staked, uint256 rewardDebt, uint256 claimed)",
          "function totalStaked() external view returns (uint256)",
          "function totalPendingSurf() external view returns (uint256)",
          "function stake(uint256 amount) external",
          "function withdraw(uint256 amount) external",
          "function claim() external",
          "function estimateGas(bytes calldata data) external view returns (uint256)",
          "function surfPool() external view returns (address)",
        ],
      },
      surf: {
        address: "0xEa319e87Cf06203DAe107Dd8E5672175e3Ee976c",
        abi: [
          "function balanceOf(address) external view returns (uint256)",
          "function allowance(address owner, address spender) external view returns (uint256)",
          "function approve(address spender, uint256 amount) external returns (bool)",
        ],
      },
      mumuFrens: {
        address: "0xC388e31d7a85F59a18E4D3bCE52f531F5ebA1567",
        abi: [
          {
            inputs: [
              {
                components: [
                  { internalType: "bytes32", name: "key", type: "bytes32" },
                  {
                    internalType: "bytes32[]",
                    name: "proof",
                    type: "bytes32[]",
                  },
                ],
                internalType: "struct Auth",
                name: "auth",
                type: "tuple",
              },
              { internalType: "uint256", name: "quantity", type: "uint256" },
              { internalType: "address", name: "affiliate", type: "address" },
              { internalType: "bytes", name: "signature", type: "bytes" },
            ],
            name: "mint",
            outputs: [],
            stateMutability: "payable",
            type: "function",
          },
          {
            inputs: [
              { internalType: "address", name: "owner", type: "address" },
            ],
            name: "balanceOf",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [
              { internalType: "uint256", name: "tokenId", type: "uint256" },
            ],
            name: "ownerOf",
            outputs: [{ internalType: "address", name: "", type: "address" }],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [
              { internalType: "uint256", name: "tokenId", type: "uint256" },
            ],
            name: "tokenURI",
            outputs: [{ internalType: "string", name: "", type: "string" }],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [
              { internalType: "uint256", name: "tokenId", type: "uint256" },
            ],
            name: "getTokenMsg",
            outputs: [{ internalType: "string", name: "", type: "string" }],
            stateMutability: "view",
            type: "function",
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                internalType: "address",
                name: "from",
                type: "address",
              },
              {
                indexed: true,
                internalType: "address",
                name: "to",
                type: "address",
              },
              {
                indexed: true,
                internalType: "uint256",
                name: "tokenId",
                type: "uint256",
              },
            ],
            name: "Transfer",
            type: "event",
          },
        ],
      },
    };

    // Price cache
    this.priceCache = {
      surf: { data: null, timestamp: 0 },
      eth: { data: null, timestamp: 0 },
      lp: { data: null, timestamp: 0 },
    };

    // Bind methods
    this.handleAccountsChanged = this.handleAccountsChanged.bind(this);
    this.handleChainChanged = this.handleChainChanged.bind(this);

    // Initialize on construction
    this.init();
  }

  async init() {
    try {
      // Load ethers.js if not already loaded
      if (typeof ethers === "undefined") {
        await this.loadEthers();
      }

      // Set up event listeners
      this.setupEventListeners();

      // Check for existing connection
      await this.checkExistingConnection();

      this.isInitialized = true;
      this.emit("initialized");
    } catch (error) {
      console.error("Web3Manager initialization failed:", error);
    }
  }

  async loadEthers() {
    return new Promise((resolve, reject) => {
      if (typeof ethers !== "undefined") {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  setupEventListeners() {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", this.handleAccountsChanged);
      window.ethereum.on("chainChanged", this.handleChainChanged);
    }

    // Listen for storage changes (wallet connection from other tabs)
    window.addEventListener("storage", (e) => {
      if (e.key === "connectedWallet") {
        this.checkExistingConnection();
      }
    });

    // Cleanup on page unload
    window.addEventListener("beforeunload", () => {
      this.cleanup();
    });
  }

  async checkExistingConnection() {
    const connectedWallet = localStorage.getItem("connectedWallet");

    if (connectedWallet && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (accounts.includes(connectedWallet)) {
          await this.connect(connectedWallet);
        } else {
          this.disconnect();
        }
      } catch (error) {
        console.error("Error checking existing connection:", error);
        this.disconnect();
      }
    }
  }

  async connect(account = null) {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }

      if (!account) {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        account = accounts[0];
      }

      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      this.userAccount = account;

      // Initialize contracts
      this.initializeContracts();

      // Store connection
      localStorage.setItem("connectedWallet", account);

      this.emit("connected", { account, provider: this.provider });

      return { success: true, account };
    } catch (error) {
      console.error("Connection failed:", error);
      this.emit("connectionError", error);
      return { success: false, error: error.message };
    }
  }

  disconnect() {
    // Clean up contracts
    this.contracts.clear();

    // Clear intervals
    this.intervals.forEach((interval, key) => {
      clearInterval(interval);
    });
    this.intervals.clear();

    // Reset state
    this.provider = null;
    this.signer = null;
    this.userAccount = null;

    // Clear storage
    localStorage.removeItem("connectedWallet");

    this.emit("disconnected");
  }

  initializeContracts() {
    if (!this.signer) return;

    Object.entries(this.contractConfigs).forEach(([name, config]) => {
      try {
        const contract = new ethers.Contract(
          config.address,
          config.abi,
          this.signer
        );
        this.contracts.set(name, contract);
      } catch (error) {
        console.error(`Failed to initialize ${name} contract:`, error);
      }
    });
  }

  getContract(name) {
    return this.contracts.get(name);
  }

  // Wallet info methods
  isConnected() {
    return !!this.userAccount;
  }

  getAccount() {
    return this.userAccount;
  }

  getShortAddress() {
    if (!this.userAccount) return "";
    return `${this.userAccount.slice(0, 6)}...${this.userAccount.slice(-4)}`;
  }

  async getBalance() {
    if (!this.provider || !this.userAccount) return "0";
    try {
      const balance = await this.provider.getBalance(this.userAccount);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error("Error fetching balance:", error);
      return "0";
    }
  }

  async getNetworkInfo() {
    if (!this.provider) return null;
    try {
      const network = await this.provider.getNetwork();
      return {
        chainId: network.chainId,
        name: this.getNetworkName(network.chainId),
      };
    } catch (error) {
      console.error("Error fetching network info:", error);
      return null;
    }
  }

  getNetworkName(chainId) {
    const networks = {
      1: "Ethereum Mainnet",
      5: "Goerli Testnet",
      42161: "Arbitrum One",
      421614: "Arbitrum Sepolia",
    };
    return networks[chainId] || `Chain ${chainId}`;
  }

  // Enhanced LP price calculation with live prices
  async getLPTokenPrice() {
    const cacheKey = "lp";
    const cache = this.priceCache[cacheKey];

    // Return cached price if less than 5 minutes old
    if (cache.data && Date.now() - cache.timestamp < 300000) {
      return cache.data;
    }

    try {
      console.log("Fetching LP token price with live data...");

      // Get current ETH/USD price
      const ethPriceUSD = await this.getETHPrice();
      console.log("Current ETH price:", ethPriceUSD);

      // Get whirlpool contract to find LP token address
      const whirlpool = this.getContract("whirlpool");
      if (!whirlpool) {
        throw new Error("Whirlpool contract not available");
      }

      // Get LP token address from whirlpool
      const lpTokenAddress = await whirlpool.surfPool();

      // Uniswap V2 pair ABI for getting reserves and supply
      const pairAbi = [
        "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
        "function totalSupply() external view returns (uint256)",
        "function token0() external view returns (address)",
        "function token1() external view returns (address)",
        "function decimals() external view returns (uint8)",
      ];

      const pairContract = new ethers.Contract(
        lpTokenAddress,
        pairAbi,
        this.provider
      );

      const [reserves, totalSupply, token0, token1] = await Promise.all([
        pairContract.getReserves(),
        pairContract.totalSupply(),
        pairContract.token0(),
        pairContract.token1(),
      ]);

      // Convert reserves (assume 18 decimals for both tokens)
      const reserve0 = parseFloat(
        ethers.utils.formatUnits(reserves.reserve0, 18)
      );
      const reserve1 = parseFloat(
        ethers.utils.formatUnits(reserves.reserve1, 18)
      );
      const totalLPSupply = parseFloat(
        ethers.utils.formatUnits(totalSupply, 18)
      );

      console.log("LP Pair info:", {
        token0,
        token1,
        reserve0,
        reserve1,
        totalLPSupply,
        surfToken: this.contractConfigs.surf.address.toLowerCase(),
      });

      let surfReserve, ethReserve, surfPriceUSD;

      if (
        token0.toLowerCase() === this.contractConfigs.surf.address.toLowerCase()
      ) {
        // token0 is SURF, token1 is ETH
        surfReserve = reserve0;
        ethReserve = reserve1;
      } else if (
        token1.toLowerCase() === this.contractConfigs.surf.address.toLowerCase()
      ) {
        // token1 is SURF, token0 is ETH
        surfReserve = reserve1;
        ethReserve = reserve0;
      } else {
        console.warn(
          "Neither token appears to be SURF - using fallback calculation"
        );
        // Fallback: assume both tokens have some value
        const totalValueUSD = (reserve0 + reserve1) * ethPriceUSD * 0.5;
        const lpPrice = totalLPSupply > 0 ? totalValueUSD / totalLPSupply : 0;

        this.priceCache[cacheKey] = { data: lpPrice, timestamp: Date.now() };
        return lpPrice;
      }

      // Calculate SURF price in USD from the pair ratio
      surfPriceUSD =
        surfReserve > 0 ? (ethReserve / surfReserve) * ethPriceUSD : 0;

      // Calculate total pool value in USD
      const surfValueUSD = surfReserve * surfPriceUSD;
      const ethValueUSD = ethReserve * ethPriceUSD;
      const totalValueUSD = surfValueUSD + ethValueUSD;

      // Calculate LP token price
      const lpPrice = totalLPSupply > 0 ? totalValueUSD / totalLPSupply : 0;

      console.log("Live LP price calculation:", {
        ethPriceUSD: ethPriceUSD.toFixed(2),
        surfPriceUSD: surfPriceUSD.toFixed(6),
        surfReserve: surfReserve.toFixed(2),
        ethReserve: ethReserve.toFixed(6),
        surfValueUSD: surfValueUSD.toFixed(2),
        ethValueUSD: ethValueUSD.toFixed(2),
        totalValueUSD: totalValueUSD.toFixed(2),
        totalLPSupply: totalLPSupply.toFixed(6),
        lpPrice: lpPrice.toFixed(6),
      });

      // Cache the result
      this.priceCache[cacheKey] = { data: lpPrice, timestamp: Date.now() };
      return lpPrice;
    } catch (error) {
      console.error("Error calculating LP price with live data:", error);

      // Fallback to estimated calculation using SURF price
      try {
        const surfData = await this.getSurfPrice();
        const ethPriceUSD = await this.getETHPrice();

        if (surfData.usd > 0) {
          const estimatedSurfInPool = 100000;
          const estimatedETHInPool =
            (estimatedSurfInPool * surfData.usd) / ethPriceUSD;
          const totalPoolValueUSD =
            estimatedSurfInPool * surfData.usd +
            estimatedETHInPool * ethPriceUSD;
          const estimatedLPSupply = 1000;
          const fallbackPrice = totalPoolValueUSD / estimatedLPSupply;

          console.log("Using fallback LP price calculation:", fallbackPrice);
          this.priceCache[cacheKey] = {
            data: fallbackPrice,
            timestamp: Date.now(),
          };
          return fallbackPrice;
        }
      } catch (fallbackError) {
        console.error(
          "Fallback LP price calculation also failed:",
          fallbackError
        );
      }

      // Final fallback
      return cache.data || 1.0;
    }
  }

  // Price fetching methods with caching
  async getETHPrice() {
    const cacheKey = "eth";
    const cache = this.priceCache[cacheKey];

    // Return cached price if less than 5 minutes old
    if (cache.data && Date.now() - cache.timestamp < 300000) {
      return cache.data;
    }

    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
      );
      const data = await response.json();
      const price = data.ethereum.usd;

      this.priceCache[cacheKey] = { data: price, timestamp: Date.now() };
      return price;
    } catch (error) {
      console.error("Error fetching ETH price:", error);
      return cache.data || 3000; // Fallback to cached or default
    }
  }

  async getSurfPrice() {
    const cacheKey = "surf";
    const cache = this.priceCache[cacheKey];

    if (cache.data && Date.now() - cache.timestamp < 300000) {
      return cache.data;
    }

    try {
      // Try CoinGecko first
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=surf-finance&vs_currencies=usd,eth"
      );

      if (response.ok) {
        const data = await response.json();
        const surfData = data["surf-finance"];

        if (surfData && surfData.usd > 0) {
          const priceData = {
            usd: surfData.usd,
            eth: surfData.eth || 0,
          };
          this.priceCache[cacheKey] = {
            data: priceData,
            timestamp: Date.now(),
          };
          return priceData;
        }
      }

      // Fallback to DexScreener
      const dexResponse = await fetch(
        "https://api.dexscreener.com/latest/dex/tokens/0xEa319e87Cf06203DAe107Dd8E5672175e3Ee976c"
      );

      if (dexResponse.ok) {
        const dexData = await dexResponse.json();
        if (dexData.pairs && dexData.pairs.length > 0) {
          const pair = dexData.pairs[0];
          const priceData = {
            usd: parseFloat(pair.priceUsd) || 0,
            eth: parseFloat(pair.priceNative) || 0,
          };
          this.priceCache[cacheKey] = {
            data: priceData,
            timestamp: Date.now(),
          };
          return priceData;
        }
      }
    } catch (error) {
      console.error("Error fetching SURF price:", error);
    }

    // Return cached or fallback
    return cache.data || { usd: 0.0001, eth: 0 };
  }

  // Whirlpool-specific methods
  async getWhirlpoolUserInfo() {
    if (!this.userAccount) return null;

    const whirlpool = this.getContract("whirlpool");
    const surf = this.getContract("surf");

    if (!whirlpool || !surf) return null;

    try {
      const [userInfo, surfBalance, poolInfo] = await Promise.all([
        whirlpool.userInfo(this.userAccount),
        surf.balanceOf(this.userAccount),
        whirlpool.getAllInfoFor(this.userAccount),
      ]);

      return {
        staked: ethers.utils.formatEther(userInfo.staked),
        claimed: ethers.utils.formatEther(userInfo.claimed),
        pendingRewards: ethers.utils.formatEther(poolInfo[1][1]),
        surfBalance: ethers.utils.formatEther(surfBalance),
        isActive: poolInfo[0],
      };
    } catch (error) {
      console.error("Error fetching whirlpool user info:", error);
      return null;
    }
  }

  async getWhirlpoolStats() {
    const whirlpool = this.getContract("whirlpool");
    if (!whirlpool) return null;

    try {
      const [totalStaked, totalPending] = await Promise.all([
        whirlpool.totalStaked(),
        whirlpool.totalPendingSurf(),
      ]);

      return {
        totalStaked: ethers.utils.formatEther(totalStaked),
        totalPending: ethers.utils.formatEther(totalPending),
      };
    } catch (error) {
      console.error("Error fetching whirlpool stats:", error);
      return null;
    }
  }

  async stakeTokens(amount) {
    const whirlpool = this.getContract("whirlpool");
    const surf = this.getContract("surf");

    if (!whirlpool || !surf) {
      throw new Error("Contracts not initialized");
    }

    const amountWei = ethers.utils.parseEther(amount.toString());

    // Check and approve if needed
    const currentAllowance = await surf.allowance(
      this.userAccount,
      whirlpool.address
    );

    if (currentAllowance.lt(amountWei)) {
      const approveTx = await surf.approve(whirlpool.address, amountWei);
      await approveTx.wait();
    }

    const tx = await whirlpool.stake(amountWei);
    return await tx.wait();
  }

  async withdrawTokens(amount) {
    const whirlpool = this.getContract("whirlpool");
    if (!whirlpool) throw new Error("Whirlpool contract not initialized");

    const amountWei = ethers.utils.parseEther(amount.toString());
    const tx = await whirlpool.withdraw(amountWei);
    return await tx.wait();
  }

  async claimRewards() {
    const whirlpool = this.getContract("whirlpool");
    if (!whirlpool) throw new Error("Whirlpool contract not initialized");

    const tx = await whirlpool.claim();
    return await tx.wait();
  }

  // NFT methods
  async mintMumuFrens(quantity) {
    const contract = this.getContract("mumuFrens");
    if (!contract) throw new Error("Mumu Frens contract not initialized");

    const auth = {
      key: "0x0000000000000000000000000000000000000000000000000000000000000000",
      proof: [],
    };
    const affiliate = ethers.constants.AddressZero;
    const signature = "0x";
    const pricePerMint = ethers.utils.parseEther("0.005");
    const totalCost = pricePerMint.mul(quantity);

    const tx = await contract.mint(auth, quantity, affiliate, signature, {
      value: totalCost,
    });

    return await tx.wait();
  }

  async getMumuFrensBalance() {
    if (!this.userAccount) return 0;

    const contract = this.getContract("mumuFrens");
    if (!contract) return 0;

    try {
      const balance = await contract.balanceOf(this.userAccount);
      return balance.toNumber();
    } catch (error) {
      console.error("Error fetching Mumu Frens balance:", error);
      return 0;
    }
  }

  // Get user's owned NFT token IDs (memory optimized)
  async getMumuFrensTokens() {
    if (!this.userAccount) return [];

    try {
      // Use a read-only provider to avoid creating new instances
      const readProvider =
        this.provider || new ethers.providers.CloudflareProvider();
      const readContract = new ethers.Contract(
        this.contractConfigs.mumuFrens.address,
        this.contractConfigs.mumuFrens.abi,
        readProvider
      );

      const balance = await readContract.balanceOf(this.userAccount);

      if (balance.eq(0)) {
        return [];
      }

      // Optimize: Only query recent blocks instead of from 0
      const currentBlock = await readProvider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 100000); // Last ~100k blocks

      const filter = readContract.filters.Transfer(null, this.userAccount);
      const events = await readContract.queryFilter(
        filter,
        fromBlock,
        "latest"
      );

      // Get unique token IDs
      const tokenIds = [
        ...new Set(events.map((event) => event.args.tokenId.toString())),
      ];

      // Verify ownership (batch calls would be better, but this is simpler)
      const ownedTokens = [];
      for (const tokenId of tokenIds.slice(0, 50)) {
        // Limit to 50 to prevent memory issues
        try {
          const owner = await readContract.ownerOf(tokenId);
          if (owner.toLowerCase() === this.userAccount.toLowerCase()) {
            ownedTokens.push(tokenId);
          }
        } catch (error) {
          // Token doesn't exist or not accessible
        }
      }

      return ownedTokens;
    } catch (error) {
      console.error("Error fetching NFT tokens:", error);
      return [];
    }
  }

  // Get NFT metadata (with caching)
  async getNFTMetadata(tokenId) {
    const cacheKey = `nft_${tokenId}`;

    // Check cache (cache for 1 hour)
    if (
      this.priceCache[cacheKey] &&
      Date.now() - this.priceCache[cacheKey].timestamp < 3600000
    ) {
      return this.priceCache[cacheKey].data;
    }

    try {
      const contract = this.getContract("mumuFrens");
      if (!contract) return null;

      const [tokenURI, message] = await Promise.all([
        contract.tokenURI(tokenId).catch(() => ""),
        contract.getTokenMsg(tokenId).catch(() => ""),
      ]);

      let metadata = null;
      if (tokenURI && tokenURI.trim()) {
        try {
          const response = await fetch(tokenURI);
          metadata = await response.json();
        } catch (error) {
          console.log(`Could not load metadata for token ${tokenId}`);
        }
      }

      const result = {
        tokenId,
        tokenURI,
        message: message && message.trim() ? message : null,
        metadata,
      };

      // Cache the result
      this.priceCache[cacheKey] = {
        data: result,
        timestamp: Date.now(),
      };

      return result;
    } catch (error) {
      console.error(`Error fetching metadata for token ${tokenId}:`, error);
      return { tokenId, tokenURI: "", message: null, metadata: null };
    }
  }

  // Auto-refresh methods
  startAutoRefresh(component, interval = 30000) {
    if (this.intervals.has(component)) {
      this.stopAutoRefresh(component);
    }

    const refreshInterval = setInterval(() => {
      this.emit(`refresh:${component}`);
    }, interval);

    this.intervals.set(component, refreshInterval);
  }

  stopAutoRefresh(component) {
    const interval = this.intervals.get(component);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(component);
    }
  }

  // Event system
  addEventListener(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  removeEventListener(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data = null) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Cleanup method
  cleanup() {
    // Clear all intervals
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.intervals.clear();

    // Remove MetaMask event listeners
    if (window.ethereum) {
      window.ethereum.removeListener(
        "accountsChanged",
        this.handleAccountsChanged
      );
      window.ethereum.removeListener("chainChanged", this.handleChainChanged);
    }

    // Clear event listeners
    this.eventListeners.clear();

    console.log("Web3Manager cleaned up");
  }

  // Event handlers
  async handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
      this.disconnect();
    } else if (accounts[0] !== this.userAccount) {
      await this.connect(accounts[0]);
    }
  }

  handleChainChanged(chainId) {
    // Reload page on chain change for simplicity
    window.location.reload();
  }
}

// Create global instance
window.web3Manager = new Web3Manager();

// Export for modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = Web3Manager;
}
