import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.24",
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
  w3f: {
    rootDir: "./gelato-functions",
    debug: false,
    networks: ["hardhat"],
  },
};

export default config;
