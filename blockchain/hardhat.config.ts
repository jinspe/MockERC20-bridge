import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  // defaultNetwork: "arbitrumSepolia",
  networks: {
    arbitrumSepolia: {
      url: process.env.ARBITRUM_SEPOLIA_URL || "",
      accounts: [process.env.PRIVATE_KEY || ""],
    },
    optimismSepolia: {
      url: process.env.OPTIMISM_SEPOLIA_URL || "",
      accounts: [process.env.PRIVATE_KEY || ""],
    },
  },
  etherscan: {
    apiKey: {
      arbitrumSepolia: process.env.ARBITRUM_EXPLORER_API_KEY || "",
      optimismSepolia: process.env.OPTIMISM_EXPLORER_API_KEY || "",
    },
    customChains: [
      {
        network: "optimismSepolia",
        chainId: 11155420,
        urls: {
          apiURL: "https://api-sepolia-optimistic.etherscan.io/api",
          browserURL: "https://sepolia-optimistic.etherscan.io/",
        },
      },
      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io/",
        },
      },
    ],
  },
  w3f: {
    rootDir: "./gelato-functions",
    debug: false,
    networks: ["hardhat"],
  },
};

export default config;
