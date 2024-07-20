import hre from "hardhat";
import { MockERC20 } from "../typechain-types";

// TODO: make it configurable via CLI with hardhat task arguments

// Arbitrum sepolia
// const CONTRACT_ADDRESS = "0x50B09EDaB5F9Bb0Cd83EC847131e67E683BbC986";
// Optimism sepolia
const CONTRACT_ADDRESS = "0x7DfA9A4Aced727b0349D8fB68473c2FdC8f51aB5";
const TOKEN_AMOUNT = "1";

async function mintTokens() {
  const [deployer] = await hre.ethers.getSigners();

  const mockERC20Factory = await hre.ethers.getContractFactory("MockERC20");
  const mockERC20 = mockERC20Factory.attach(CONTRACT_ADDRESS) as MockERC20;

  const amountToBurn = hre.ethers.parseUnits(TOKEN_AMOUNT, 18);
  await mockERC20.burn(amountToBurn);

  console.log(`Burned ${amountToBurn.toString()}`);
}

mintTokens()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error minting tokens:", error);
    process.exit(1);
  });
