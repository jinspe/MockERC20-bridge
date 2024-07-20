import path from "path";
import { Web3FunctionLoader } from "@gelatonetwork/web3-functions-sdk/loader";
import { expect } from "chai";
import { runWeb3Function } from "./runWeb3Function";
import hre from "hardhat";
import { JsonRpcProvider } from "@ethersproject/providers";
import { Wallet, TransactionReceipt, ethers } from "ethers";

const w3fName = "erc20-bridge";
const w3fRootDir = path.join("gelato-functions");
const w3fPath = path.join(w3fRootDir, w3fName, "index.ts");

const ARBITRUM_SEP_CHAIN_ID = 421614;
const OPTIMISM_SEP_CHAIN_ID = 11155420;
const GELATO_FORWARDER = "0xd8253782c45a12053594b9deB72d8e8aB2Fca54c";

const AMOUNT_TO_MINT = "100";
const AMOUNT_TO_BURN = "50";

const WAIT_TIME_AFTER_FUNCTION_EXECUTION = 5000;

// Using low level transactions to mint and burn tokens as we need to change the provider
const abi = [
  "function balanceOf(address) view returns (uint256)",
  "function mint(address to, uint256 amount)",
  "function burn(uint256 amount)",
];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function deployContract({
  ownerAddress,
  signer,
}: {
  ownerAddress: string;
  signer: Wallet;
}): Promise<string> {
  const MockERC20Factory = await hre.ethers.getContractFactory(
    "MockERC20",
    signer
  );
  const MockERC20ArbitrumNew = await MockERC20Factory.deploy(
    "Mock Token",
    "MTK",
    ownerAddress,
    GELATO_FORWARDER
  );
  const contractAddress = await MockERC20ArbitrumNew.getAddress();
  return contractAddress;
}

async function mintTokens({
  contractAddress,
  signer,
  toAddress,
  amount,
}: {
  contractAddress: string;
  signer: Wallet;
  toAddress: string;
  amount: string; // Amount in Ether as a string
}): Promise<TransactionReceipt | null> {
  const abi = ["function mint(address to, uint256 amount)"];
  const iface = new ethers.Interface(abi);
  const data = iface.encodeFunctionData("mint", [
    toAddress,
    ethers.parseEther(amount),
  ]);
  const tx = {
    to: contractAddress,
    data: data,
  };
  const txResponse = await signer.sendTransaction(tx);
  const receipt = await txResponse.wait();
  return receipt;
}

async function burnTokens({
  contractAddress,
  signer,
  amount,
}: {
  contractAddress: string;
  signer: Wallet;
  amount: string;
}): Promise<TransactionReceipt | null> {
  const iface = new ethers.Interface(abi);
  const data = iface.encodeFunctionData("burn", [ethers.parseEther(amount)]);
  const tx = {
    to: contractAddress,
    data: data,
  };
  const txResponse = await signer.sendTransaction(tx);
  const receipt = await txResponse.wait();
  return receipt;
}

async function checkBalance({
  contractAddress,
  provider,
  address,
}: {
  contractAddress: string;
  provider: JsonRpcProvider;
  address: string;
}): Promise<bigint> {
  const abi = ["function balanceOf(address) view returns (uint256)"];
  const iface = new ethers.Interface(abi);
  const data = iface.encodeFunctionData("balanceOf", [address]);
  const result = await provider.call({
    to: contractAddress,
    data: data,
  });
  const balance = ethers.toBigInt(result);
  return balance;
}

describe("Cross-chain ERC20 Test", () => {
  it("Cross-Chain Operations via Relay", async () => {
    const { secrets } = Web3FunctionLoader.load(w3fName, w3fRootDir);
    const privateKey = secrets["PRIVATE_KEY"];

    const arbitrumRpc = secrets["ARBITRUM_SEP_RPC_URL"];
    const optimismRpc = secrets["OPTIMISM_SEP_RPC_URL"];
    const arbitrumProvider = new JsonRpcProvider(arbitrumRpc);
    const optimismProvider = new JsonRpcProvider(optimismRpc);
    const arbitrumSigner = new ethers.Wallet(
      privateKey,
      new ethers.JsonRpcProvider(arbitrumRpc)
    );
    const optimismSigner = new ethers.Wallet(
      privateKey,
      new ethers.JsonRpcProvider(optimismRpc)
    );
    const ownerAddress = await arbitrumSigner.getAddress();

    const contractAddressOptimism = await deployContract({
      ownerAddress,
      signer: optimismSigner,
    });
    console.log(
      "MockERC20 deployed on Optimism Sepolia at:",
      contractAddressOptimism
    );
    const contractAddressArbitrum = await deployContract({
      ownerAddress,
      signer: arbitrumSigner,
    });
    console.log(
      "MockERC20 deployed on Arbitrum Sepolia at:",
      contractAddressArbitrum
    );

    const arbitrumContext = {
      secrets: {
        ...secrets,
        CHAIN_LISTENED: "arbitrumSepolia",
        ARBITRUM_SEP_CONTRACT_ADDRESS: contractAddressArbitrum,
        OPTIMISM_SEP_CONTRACT_ADDRESS: contractAddressOptimism,
      },
      storage: {},
      gelatoArgs: {
        chainId: ARBITRUM_SEP_CHAIN_ID,
        gasPrice: ethers.parseUnits("100", "gwei").toString(),
      },
      userArgs: {},
    };

    const optimismContext = {
      secrets: {
        ...secrets,
        CHAIN_LISTENED: "optimismSepolia",
        ARBITRUM_SEP_CONTRACT_ADDRESS: contractAddressArbitrum,
        OPTIMISM_SEP_CONTRACT_ADDRESS: contractAddressOptimism,
      },
      storage: {},
      gelatoArgs: {
        chainId: OPTIMISM_SEP_CHAIN_ID,
        gasPrice: ethers.parseUnits("100", "gwei").toString(),
      },
      userArgs: {},
    };

    // 1. Mint tokens on Arbitrum
    const initialBalanceArbitrum = await checkBalance({
      contractAddress: contractAddressArbitrum,
      provider: arbitrumProvider,
      address: ownerAddress,
    });
    console.log(
      "Initial Arbitrum balance:",
      ethers.formatEther(initialBalanceArbitrum)
    );
    await mintTokens({
      contractAddress: contractAddressArbitrum,
      signer: arbitrumSigner,
      toAddress: ownerAddress,
      amount: AMOUNT_TO_MINT,
    });

    const afterMintBalanceArbitrum = await checkBalance({
      contractAddress: contractAddressArbitrum,
      provider: arbitrumProvider,
      address: ownerAddress,
    });
    console.log(
      "Balance after minting on Arbitrum:",
      ethers.formatEther(afterMintBalanceArbitrum)
    );
    expect(afterMintBalanceArbitrum).to.equal(
      initialBalanceArbitrum + ethers.parseEther(AMOUNT_TO_MINT)
    );

    // 2. Burn tokens on Arbitrum
    await burnTokens({
      contractAddress: contractAddressArbitrum,
      signer: arbitrumSigner,
      amount: AMOUNT_TO_BURN,
    });

    const afterBurnBalanceArbitrum = await checkBalance({
      contractAddress: contractAddressArbitrum,
      provider: arbitrumProvider,
      address: ownerAddress,
    });
    console.log(
      "Balance after burning on Arbitrum:",
      ethers.formatEther(afterBurnBalanceArbitrum)
    );
    expect(afterBurnBalanceArbitrum).to.equal(
      afterMintBalanceArbitrum - ethers.parseEther(AMOUNT_TO_BURN)
    );

    // 3. Execute the gelato function on Arbitrum as listener
    const initialBalanceOptimism = await checkBalance({
      contractAddress: contractAddressOptimism,
      provider: optimismProvider,
      address: ownerAddress,
    });
    console.log(
      "Initial Optimism balance:",
      ethers.formatEther(initialBalanceOptimism)
    );

    const { result: arbitrumRunRes } = await runWeb3Function(
      w3fPath,
      arbitrumContext,
      [arbitrumProvider]
    );
    expect(arbitrumRunRes.canExec).to.be.true;
    // sleep to not exceed the rate limit
    await sleep(WAIT_TIME_AFTER_FUNCTION_EXECUTION);

    const afterRelayBalanceOptimism = await checkBalance({
      contractAddress: contractAddressArbitrum,
      provider: arbitrumProvider,
      address: ownerAddress,
    });
    console.log(
      "Balance after cross-chain relay on Optimism:",
      ethers.formatEther(afterRelayBalanceOptimism)
    );
    expect(afterRelayBalanceOptimism).to.equal(
      initialBalanceOptimism + ethers.parseEther(AMOUNT_TO_BURN)
    );

    // 5. Burn tokens on Optimism
    await burnTokens({
      contractAddress: contractAddressOptimism,
      signer: optimismSigner,
      amount: AMOUNT_TO_BURN,
    });

    const afterBurnBalanceOptimism = await checkBalance({
      contractAddress: contractAddressOptimism,
      provider: optimismProvider,
      address: ownerAddress,
    });
    console.log(
      "Final Optimism balance after burning:",
      ethers.formatEther(afterBurnBalanceOptimism)
    );
    expect(afterBurnBalanceOptimism).to.equal(
      afterRelayBalanceOptimism - ethers.parseEther(AMOUNT_TO_BURN)
    );

    // 6. Execute the gelato function on Optimism as listener
    const { result: optimismRunRes } = await runWeb3Function(
      w3fPath,
      optimismContext,
      [optimismProvider]
    );
    expect(optimismRunRes.canExec).to.be.true;
    // Wait to not exceed the rate limit
    await new Promise((resolve) =>
      setTimeout(resolve, WAIT_TIME_AFTER_FUNCTION_EXECUTION)
    );

    const finalBalanceArbitrum = await checkBalance({
      contractAddress: contractAddressArbitrum,
      provider: arbitrumProvider,
      address: ownerAddress,
    });
    console.log(
      "Final Arbitrum balance after cross-chain relay:",
      ethers.formatEther(finalBalanceArbitrum)
    );
    expect(finalBalanceArbitrum).to.equal(
      afterBurnBalanceArbitrum + ethers.parseEther(AMOUNT_TO_BURN)
    );
  });
});
