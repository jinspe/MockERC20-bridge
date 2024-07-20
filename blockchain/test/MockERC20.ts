import { MockERC20 } from "../typechain-types";
import { expect } from "chai";
import hre from "hardhat";

const GELATO_FORWARDER = "0xd8253782c45a12053594b9deB72d8e8aB2Fca54c";

describe("MockERC20", function () {
  let ownerAddress: string;
  let MockERC20: MockERC20;
  before(async () => {
    const [owner] = await hre.ethers.getSigners();

    ownerAddress = await owner.getAddress();

    console.log("Owner address:", ownerAddress);

    console.log("Deploying MockERC20 contract...");
    const MockERC20Factory = await hre.ethers.getContractFactory("MockERC20");
    MockERC20 = await MockERC20Factory.deploy(
      "Mock Token",
      "MTK",
      ownerAddress,
      GELATO_FORWARDER
    );
    const deployAddress = await MockERC20.getAddress();
    console.log("MockERC20 contract deployed:", deployAddress);
  });

  it("Should mint and burn tokens", async function () {
    const initialBalance = await MockERC20.balanceOf(ownerAddress);

    console.log("Initial balance:", hre.ethers.formatEther(initialBalance));

    // Mint tokens as the owner
    console.log("Minting 100 tokens...");
    await expect(MockERC20.mint(ownerAddress, hre.ethers.parseEther("100"))).not
      .to.be.reverted;

    const afterMintBalance = await MockERC20.balanceOf(ownerAddress);
    console.log("New balance:", hre.ethers.formatEther(afterMintBalance));

    const mintAmount = hre.ethers.parseEther("100");
    const afterMintexpectedBalance = initialBalance + mintAmount;
    expect(afterMintBalance.toString()).to.equal(
      afterMintexpectedBalance.toString()
    );

    // Burn tokens as the owner
    console.log("Burning 50 tokens...");
    await expect(MockERC20.burn(hre.ethers.parseEther("50"))).not.to.be
      .reverted;

    const afterBurnbalance = await MockERC20.balanceOf(ownerAddress);
    console.log("New balance:", hre.ethers.formatEther(afterBurnbalance));

    const afterBurnExpectedBalance =
      afterMintexpectedBalance - hre.ethers.parseEther("50");
    expect(afterBurnbalance.toString()).to.equal(afterBurnExpectedBalance);
  });
});
