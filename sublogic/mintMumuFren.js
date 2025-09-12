// mintMumuFren.js
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js";

const CONTRACT_ADDRESS = "0xC388e31d7a85F59a18E4D3bCE52f531F5ebA1567";
const CONTRACT_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: "bytes32", name: "key", type: "bytes32" },
          { internalType: "bytes32[]", name: "proof", type: "bytes32[]" },
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
];

window.addEventListener("DOMContentLoaded", () => {
  const mintBtn = document.getElementById("mumu-frensMintButton");
  if (!mintBtn) {
    console.error("Button #mumu-frensMintButton not found");
    return;
  }

  mintBtn.addEventListener("click", async () => {
    try {
      console.log("Mint button clicked");

      if (!window.ethereum) throw new Error("No wallet found");

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      // Public mint parameters
      const auth = {
        key: "0x0000000000000000000000000000000000000000000000000000000000000000",
        proof: [],
      };
      const quantity = 1;
      const affiliate = ethers.constants.AddressZero;
      const signature = "0x"; // empty for public mint

      // Price per mint for public mint 2
      const pricePerMint = ethers.utils.parseEther("0.005");
      const totalCost = pricePerMint.mul(quantity);

      console.log("Sending mint tx...");
      const tx = await contract.mint(auth, quantity, affiliate, signature, {
        value: totalCost,
      });
      console.log("Tx sent:", tx.hash);

      await tx.wait();
      alert("Mint successful! Tx: " + tx.hash);
    } catch (err) {
      console.error("Mint failed:", err);
      alert("Mint failed: " + (err.message || err));
    }
  });
});
