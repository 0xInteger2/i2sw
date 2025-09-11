import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js";

window.addEventListener("DOMContentLoaded", () => {
  const mintButton = document.getElementById("polygon_WAVEMintButton");

  // --- Replace with your deployed contract ---
  const contractAddress =
    "0x3f3230f3b685bbd307ed301e785e31a983553ce8d4e190ccb403ba0365892bd1"; // testnet
  const contractABI = [
    "function mint(string memory tokenURI, bytes32[] calldata proof) public payable returns (uint256)",
  ];
  const tokenURI = "ipfs://bafybeiaaaaaaa/polywave.json"; // <-- your final hardcoded metadata JSON

  let provider, signer, nftContract;

  async function connectWallet() {
    if (!window.ethereum) {
      alert("❌ Please install MetaMask!");
      return null;
    }
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    nftContract = new ethers.Contract(contractAddress, contractABI, signer);
    return signer.getAddress();
  }

  async function mintNFT() {
    const userAddr = (await connectWallet())?.toLowerCase();
    if (!userAddr) return;

    // Load Merkle proofs JSON from your server (must be hosted alongside your site)
    const proofs = await fetch("/proofs.json").then((r) => r.json());
    const proof = proofs[userAddr] || [];

    if (proof.length === 0) {
      alert("❌ You are not on the allowlist");
      return;
    }

    try {
      const tx = await nftContract.mint(tokenURI, proof, {
        value: ethers.utils.parseEther("0.01"), // match your contract's MINT_PRICE
      });
      await tx.wait();
      alert("✅ Mint successful!");
    } catch (err) {
      console.error(err);
      alert("❌ Mint failed: " + (err.message || err));
    }
  }

  // Attach to div click
  mintButton.addEventListener("click", mintNFT);
});
