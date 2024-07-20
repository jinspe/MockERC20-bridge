import hre from "hardhat";

// Note: We are using ethers version 5 due to issues deploying with version 6.
// For details: https://ethereum.stackexchange.com/questions/144451/typeerror-cannot-read-properties-of-undefined-reading-jsonrpcprovider

const GELATO_FORWARDER = "0xd8253782c45a12053594b9deB72d8e8aB2Fca54c";

async function main() {
  const [owner] = await hre.ethers.getSigners();
  console.log("Deploying MockERC20 contract...");
  const ownerAddress = await owner.getAddress();
  console.log("Owner address:", ownerAddress);
  const MockERC20Factory = await hre.ethers.getContractFactory("MockERC20");
  const MockERC20 = await MockERC20Factory.deploy(
    "Mock Token",
    "MTK",
    ownerAddress,
    GELATO_FORWARDER
  );
  const deployAddress = await MockERC20.getAddress();
  console.log("MockERC20 contract deployed:", deployAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error during deployment:", error);
    process.exit(1);
  });
