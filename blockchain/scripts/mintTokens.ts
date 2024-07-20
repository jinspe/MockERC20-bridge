import { ethers } from "hardhat";
import { MockERC20 } from "../typechain-types";

// TODO: make it configurable via CLI with hardhat task arguments

const RECIPIENT_ADDRESS = "0x11230b3C69E3ec1cba2C33CD51e4D7488bA0552C";
// Arbitrum sepolia
const CONTRACT_ADDRESS = "0x50B09EDaB5F9Bb0Cd83EC847131e67E683BbC986";
// Optimism sepolia
// const CONTRACT_ADDRESS = "0x7DfA9A4Aced727b0349D8fB68473c2FdC8f51aB5";
const TOKEN_AMOUNT = "72";

async function mintTokens() {
  const [deployer] = await ethers.getSigners();

  const mockERC20Factory = await ethers.getContractFactory("MockERC20");
  const mockERC20 = mockERC20Factory.attach(CONTRACT_ADDRESS) as MockERC20;

  const amountToMint = ethers.parseUnits(TOKEN_AMOUNT, 18);
  await mockERC20.mint(RECIPIENT_ADDRESS, amountToMint);

  console.log(
    `Minted ${amountToMint.toString()} tokens to ${RECIPIENT_ADDRESS}`
  );
}

mintTokens()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error minting tokens:", error);
    process.exit(1);
  });
