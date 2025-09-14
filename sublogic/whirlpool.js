window.addEventListener("DOMContentLoaded", async () => {
  if (!window.ethereum) {
    alert("MetaMask required!");
    return;
  }

  const { ethers } = await import(
    "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js"
  );

  // Contract addresses
  const whirlpoolAddress = "0x999b1e6EDCb412b59ECF0C5e14c20948Ce81F40b";
  const surfTokenAddress = "0xEa319e87Cf06203DAe107Dd8E5672175e3Ee976c";

  // ABIs
  const whirlpoolAbi = [
    {
      inputs: [
        { internalType: "contract SURF", name: "_surf", type: "address" },
        { internalType: "contract Tito", name: "_tito", type: "address" },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "user",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "surfAmount",
          type: "uint256",
        },
      ],
      name: "Claim",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "user",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "ethReward",
          type: "uint256",
        },
      ],
      name: "EthRewardAdded",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "previousOwner",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "newOwner",
          type: "address",
        },
      ],
      name: "OwnershipTransferred",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "user",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "Stake",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "user",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "surfReward",
          type: "uint256",
        },
      ],
      name: "SurfRewardAdded",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "user",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "Withdraw",
      type: "event",
    },
    {
      inputs: [],
      name: "INITIAL_PAYOUT_INTERVAL",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "accSurfPerShare",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "activate",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "active",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "addEthReward",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [
        { internalType: "address", name: "_from", type: "address" },
        { internalType: "uint256", name: "_amount", type: "uint256" },
      ],
      name: "addSurfReward",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "claim",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [{ internalType: "address", name: "_user", type: "address" }],
      name: "getAllInfoFor",
      outputs: [
        { internalType: "bool", name: "isActive", type: "bool" },
        {
          internalType: "uint256[12]",
          name: "info",
          type: "uint256[12]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "initialSurfReward",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "initialSurfRewardPerDay",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "lastPayout",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "owner",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "payoutNumber",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_tokenAddress",
          type: "address",
        },
      ],
      name: "recoverERC20",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "renounceOwnership",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_payoutNumber",
          type: "uint256",
        },
      ],
      name: "rewardAtPayout",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_unstakingFee",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_convertToSurfAmount",
          type: "uint256",
        },
      ],
      name: "setUnstakingFee",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [{ internalType: "uint256", name: "_amount", type: "uint256" }],
      name: "stake",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        { internalType: "address", name: "_user", type: "address" },
        { internalType: "uint256", name: "_amount", type: "uint256" },
      ],
      name: "stakeFor",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "startTime",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "surf",
      outputs: [{ internalType: "contract SURF", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "surfPool",
      outputs: [{ internalType: "contract IERC20", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "timeUntilNextPayout",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "tito",
      outputs: [{ internalType: "contract Tito", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "totalPendingSurf",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "totalStaked",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
      name: "transferOwnership",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "uniswapRouter",
      outputs: [
        {
          internalType: "contract IUniswapV2Router02",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "unstakingFee",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "unstakingFeeConvertToSurfAmount",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "address", name: "", type: "address" }],
      name: "userInfo",
      outputs: [
        { internalType: "uint256", name: "staked", type: "uint256" },
        { internalType: "uint256", name: "rewardDebt", type: "uint256" },
        { internalType: "uint256", name: "claimed", type: "uint256" },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "weth",
      outputs: [{ internalType: "contract IERC20", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "uint256", name: "_amount", type: "uint256" }],
      name: "withdraw",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    { stateMutability: "payable", type: "receive" },
  ];

  const surfAbi = [
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "owner",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "spender",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "value",
          type: "uint256",
        },
      ],
      name: "Approval",
      type: "event",
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
          indexed: false,
          internalType: "uint256",
          name: "value",
          type: "uint256",
        },
      ],
      name: "Transfer",
      type: "event",
    },
    {
      inputs: [
        { internalType: "address", name: "owner", type: "address" },
        { internalType: "address", name: "spender", type: "address" },
      ],
      name: "allowance",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        { internalType: "address", name: "spender", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" },
      ],
      name: "approve",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [{ internalType: "address", name: "account", type: "address" }],
      name: "balanceOf",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "decimals",
      outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "name",
      outputs: [{ internalType: "string", name: "", type: "string" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "symbol",
      outputs: [{ internalType: "string", name: "", type: "string" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "totalSupply",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        { internalType: "address", name: "recipient", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" },
      ],
      name: "transfer",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        { internalType: "address", name: "sender", type: "address" },
        { internalType: "address", name: "recipient", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" },
      ],
      name: "transferFrom",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "nonpayable",
      type: "function",
    },
  ];

  let provider, signer, userAddress, whirlpool, surf;
  let lpTokenPriceCache = { price: 0, timestamp: 0 };

  // Get live ETH/USD price from CoinGecko API
  async function getETHPrice() {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
      );
      const data = await response.json();
      return data.ethereum.usd;
    } catch (error) {
      console.error("Error fetching ETH price:", error);
      return 2000; // Fallback ETH price
    }
  }

  // Enhanced LP price calculation with live prices
  async function getLPTokenPrice() {
    try {
      // Cache price for 5 minutes
      if (
        lpTokenPriceCache.price > 0 &&
        Date.now() - lpTokenPriceCache.timestamp < 300000
      ) {
        return lpTokenPriceCache.price;
      }

      console.log("Fetching LP token price with live data...");

      // Get current ETH/USD price
      const ethPriceUSD = await getETHPrice();
      console.log("Current ETH price:", ethPriceUSD);

      // Get LP token address from whirlpool
      const lpTokenAddress = await whirlpool.surfPool();

      // Uniswap V2 pair ABI
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
        provider
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
        surfToken: surfTokenAddress.toLowerCase(),
      });

      let surfReserve, ethReserve, surfPriceUSD;

      if (token0.toLowerCase() === surfTokenAddress.toLowerCase()) {
        // token0 is SURF, token1 is ETH
        surfReserve = reserve0;
        ethReserve = reserve1;
      } else if (token1.toLowerCase() === surfTokenAddress.toLowerCase()) {
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

        lpTokenPriceCache = { price: lpPrice, timestamp: Date.now() };
        return lpPrice;
      }

      // Calculate SURF price in USD from the pair ratio
      // SURF/ETH ratio * ETH/USD = SURF/USD
      surfPriceUSD =
        surfReserve > 0 ? (ethReserve / surfReserve) * ethPriceUSD : 0;

      // Calculate total pool value in USD
      const surfValueUSD = surfReserve * surfPriceUSD;
      const ethValueUSD = ethReserve * ethPriceUSD;
      const totalValueUSD = surfValueUSD + ethValueUSD;

      // Calculate LP token price
      const lpPrice = totalLPSupply > 0 ? totalValueUSD / totalLPSupply : 0;

      console.log("Live price calculation:", {
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
      lpTokenPriceCache = {
        price: lpPrice,
        timestamp: Date.now(),
      };

      return lpPrice;
    } catch (error) {
      console.error("Error calculating LP price with live data:", error);
      return 1.0; // Fallback price
    }
  }

  // Initialize connection
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    // Update UI with user address
    document.getElementById("userAddress").innerText = `${userAddress.slice(
      0,
      6
    )}...${userAddress.slice(-4)}`;

    // Initialize contracts
    whirlpool = new ethers.Contract(whirlpoolAddress, whirlpoolAbi, signer);
    surf = new ethers.Contract(surfTokenAddress, surfAbi, signer);

    console.log("Connected to:", userAddress);

    // Load initial data
    await loadFullInfo();

    // Set up auto-refresh every 30 seconds
    setInterval(loadFullInfo, 30000);
  } catch (error) {
    console.error("Failed to connect:", error);
    alert("Failed to connect to wallet: " + error.message);
    return;
  }

  // Load user-specific and global Whirlpool info
  async function loadFullInfo() {
    try {
      console.log("Loading full info...");

      // Get SURF token balance
      const surfBalance = await surf.balanceOf(userAddress);
      document.getElementById("surfBalance").innerText = parseFloat(
        ethers.utils.formatUnits(surfBalance, 18)
      ).toFixed(6);

      // Get user-specific portfolio info from userInfo function
      const userInfoResult = await whirlpool.userInfo(userAddress);
      console.log("User portfolio info:", {
        staked: userInfoResult.staked.toString(),
        rewardDebt: userInfoResult.rewardDebt.toString(),
        claimed: userInfoResult.claimed.toString(),
      });

      // Display user portfolio data from userInfo
      document.getElementById("stakedLP").innerText = parseFloat(
        ethers.utils.formatUnits(userInfoResult.staked, 18)
      ).toFixed(6);
      document.getElementById("rewardDebt").innerText = parseFloat(
        ethers.utils.formatUnits(userInfoResult.rewardDebt, 18)
      ).toFixed(6);
      document.getElementById("claimed").innerText = parseFloat(
        ethers.utils.formatUnits(userInfoResult.claimed, 18)
      ).toFixed(6);

      // Get pending rewards and contract status from getAllInfoFor
      const [isActive, info] = await whirlpool.getAllInfoFor(userAddress);
      console.log("getAllInfoFor result:", {
        isActive,
        info: info.map((x) => x.toString()),
      });

      // Update contract status
      const contractStatus = document.getElementById("contractStatus");
      if (contractStatus) {
        if (isActive) {
          contractStatus.innerText = "Contract Active ✅";
          contractStatus.className = "status-badge status-active";
        } else {
          contractStatus.innerText = "Contract Inactive ❌";
          contractStatus.className = "status-badge status-inactive";
        }
      }

      // Get pending rewards from getAllInfoFor
      document.getElementById("pendingSURF").innerText = parseFloat(
        ethers.utils.formatUnits(info[1], 18)
      ).toFixed(6);

      // Additional reward info from getAllInfoFor
      document.getElementById("payoutNum").innerText = info[8].toString();
      document.getElementById("initReward").innerText = parseFloat(
        ethers.utils.formatUnits(info[9], 18)
      ).toFixed(6);
      document.getElementById("initRewardDay").innerText = parseFloat(
        ethers.utils.formatUnits(info[10], 18)
      ).toFixed(6);

      // Get global Whirlpool statistics
      const [
        totalStakedPool,
        totalPending,
        accPerShare,
        nextPayoutSec,
        lastPayoutTs,
        unstakingFeeValue,
      ] = await Promise.all([
        whirlpool.totalStaked(),
        whirlpool.totalPendingSurf(),
        whirlpool.accSurfPerShare(),
        whirlpool.timeUntilNextPayout(),
        whirlpool.lastPayout(),
        whirlpool.unstakingFee(),
      ]);

      // Display total staked with USD value
      const totalStakedAmount = parseFloat(
        ethers.utils.formatUnits(totalStakedPool, 18)
      );
      document.getElementById("totalStaked").innerText =
        totalStakedAmount.toFixed(6);

      // Calculate and display USD value safely
      const totalStakedUSDElement = document.getElementById("totalStakedUSD");
      if (totalStakedUSDElement) {
        if (totalStakedAmount > 0) {
          try {
            const lpPrice = await getLPTokenPrice();
            const totalUSDValue = totalStakedAmount * lpPrice;
            totalStakedUSDElement.innerText = `\$${totalUSDValue.toLocaleString(
              "en-US",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}`;
          } catch (priceError) {
            console.warn("Could not fetch LP price:", priceError);
            totalStakedUSDElement.innerText = "Price unavailable";
          }
        } else {
          totalStakedUSDElement.innerText = "$0.00";
        }
      }

      // Display other pool statistics
      document.getElementById("totalPending").innerText = parseFloat(
        ethers.utils.formatUnits(totalPending, 18)
      ).toFixed(6);
      document.getElementById("accPerShare").innerText = parseFloat(
        ethers.utils.formatUnits(accPerShare, 18)
      ).toFixed(12);

      // Format time until next payout
      const nextPayoutSeconds = nextPayoutSec.toNumber();
      const h = Math.floor(nextPayoutSeconds / 3600);
      const m = Math.floor((nextPayoutSeconds % 3600) / 60);
      const s = nextPayoutSeconds % 60;
      document.getElementById("nextPayout").innerText = `${h}h ${m}m ${s}s`;

      // Format last payout timestamp
      const lastPayoutTimestamp = lastPayoutTs.toNumber();
      document.getElementById("lastPayout").innerText =
        lastPayoutTimestamp === 0
          ? "Never"
          : new Date(lastPayoutTimestamp * 1000).toLocaleString();

      // Unstaking fee
      document.getElementById("unstakingFee").innerText = parseFloat(
        ethers.utils.formatUnits(unstakingFeeValue, 18)
      ).toFixed(6);

      console.log("Info loaded successfully");
    } catch (err) {
      console.error("Error loading full info:", err);

      // Update UI to show error
      document.querySelectorAll(".loading").forEach((el) => {
        el.innerText = "Error";
        el.style.color = "red";
      });
    }
  }

  // Utility function to show transaction status
  function showTxStatus(message, isError = false) {
    if (isError) {
      alert("Error: " + message);
    } else {
      alert(message);
    }
  }

  // Stake tokens
  async function stakeTokens() {
    try {
      const amount = document.getElementById("stakeAmount").value;
      if (!amount || parseFloat(amount) <= 0) {
        showTxStatus("Please enter a valid amount to stake", true);
        return;
      }

      const amountWei = ethers.utils.parseUnits(amount.toString(), 18);

      // Check current allowance
      const currentAllowance = await surf.allowance(
        userAddress,
        whirlpoolAddress
      );

      if (currentAllowance.lt(amountWei)) {
        showTxStatus("Approving SURF tokens...");
        const approveTx = await surf.approve(whirlpoolAddress, amountWei);
        await approveTx.wait();
        showTxStatus("Approval confirmed! Now staking...");
      }

      showTxStatus("Submitting stake transaction...");
      const gasEstimate = await whirlpool.estimateGas.stake(amountWei);
      const tx = await whirlpool.stake(amountWei, {
        gasLimit: gasEstimate.mul(120).div(100),
      });

      await tx.wait();
      showTxStatus("Staking successful! 🎉");

      // Clear input and refresh
      document.getElementById("stakeAmount").value = "";
      await loadFullInfo();
    } catch (err) {
      console.error("Stake error:", err);
      showTxStatus(err.reason || err.message || "Transaction failed", true);
    }
  }

  // Withdraw tokens
  async function withdrawTokens() {
    try {
      const amount = document.getElementById("withdrawAmount").value;
      if (!amount || parseFloat(amount) <= 0) {
        showTxStatus("Please enter a valid amount to withdraw", true);
        return;
      }

      const amountWei = ethers.utils.parseUnits(amount.toString(), 18);

      showTxStatus("Submitting withdraw transaction...");
      const gasEstimate = await whirlpool.estimateGas.withdraw(amountWei);
      const tx = await whirlpool.withdraw(amountWei, {
        gasLimit: gasEstimate.mul(120).div(100),
      });

      await tx.wait();
      showTxStatus("Withdrawal successful! 💰");

      // Clear input and refresh
      document.getElementById("withdrawAmount").value = "";
      await loadFullInfo();
    } catch (err) {
      console.error("Withdraw error:", err);
      showTxStatus(err.reason || err.message || "Transaction failed", true);
    }
  }

  // Claim rewards
  async function claimRewards() {
    try {
      showTxStatus("Submitting claim transaction...");
      const gasEstimate = await whirlpool.estimateGas.claim();
      const tx = await whirlpool.claim({
        gasLimit: gasEstimate.mul(120).div(100),
      });

      await tx.wait();
      showTxStatus("Rewards claimed successfully! 🎉");
      await loadFullInfo();
    } catch (err) {
      console.error("Claim error:", err);
      showTxStatus(err.reason || err.message || "Transaction failed", true);
    }
  }

  // Set up button event listeners
  document.getElementById("stakeBtn").onclick = stakeTokens;
  document.getElementById("withdrawBtn").onclick = withdrawTokens;
  document.getElementById("claimBtn").onclick = claimRewards;

  // Handle account changes
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", async (accounts) => {
      if (accounts.length === 0) {
        alert("Please connect to MetaMask.");
      } else {
        location.reload();
      }
    });

    window.ethereum.on("chainChanged", (chainId) => {
      location.reload();
    });
  }
});
