import path from "path";
import { Web3FunctionLoader } from "@gelatonetwork/web3-functions-sdk/loader";
import { expect } from "chai";
import { runWeb3Function } from "./runWeb3Function";
import hre from "hardhat";
import { JsonRpcProvider } from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";
import { Interface } from "@ethersproject/abi";
import { Contract } from "@ethersproject/contracts";
import { parseEther, formatEther, parseUnits } from "@ethersproject/units";
import { TransactionReceipt } from "@ethersproject/abstract-provider";
import * as dotenv from "dotenv";

const w3fName = "erc20-bridge";
const w3fRootDir = path.join("gelato-functions");
const w3fPath = path.join(w3fRootDir, w3fName, "index.ts");
dotenv.config();

const ARBITRUM_SEP_CHAIN_ID = 421614;
const OPTIMISM_SEP_CHAIN_ID = 11155420;
const GELATO_FORWARDER = "0xd8253782c45a12053594b9deB72d8e8aB2Fca54c";

const AMOUNT_TO_MINT = "100";
const AMOUNT_TO_BURN = "50";

const WAIT_TIME_AFTER_FUNCTION_EXECUTION = 5000;

// Using low level transactions to mint and burn tokens as we need to change the provider
const TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function mint(address to, uint256 amount)",
  "function burn(uint256 amount)",
  "event TokensBurned(address indexed account, uint256 amount)",
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
    signer as any
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
  amount: string;
}): Promise<TransactionReceipt | null> {
  const iface = new Interface(TOKEN_ABI);
  const data = iface.encodeFunctionData("mint", [
    toAddress,
    parseEther(amount),
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
  const iface = new Interface(TOKEN_ABI);
  const data = iface.encodeFunctionData("burn", [parseEther(amount)]);
  const tx = {
    to: contractAddress,
    data: data,
  };
  const txResponse = await signer.sendTransaction(tx);
  const receipt = await txResponse.wait();
  return receipt;
}

async function getBurnEventLog({
  contractAddress,
  blockHash,
  provider,
}: {
  contractAddress: string;
  blockHash: string;
  provider: JsonRpcProvider;
}) {
  const tokenContract = new Contract(contractAddress, TOKEN_ABI, provider);
  const topics = [tokenContract.interface.getEventTopic("TokensBurned")];
  const logs = await provider.getLogs({
    address: contractAddress,
    blockHash: blockHash,
    topics: topics,
  });
  return logs[0];
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
  const iface = new Interface(TOKEN_ABI);
  const data = iface.encodeFunctionData("balanceOf", [address]);
  const result = await provider.call({
    to: contractAddress,
    data: data,
  });
  const balance = BigInt(result);
  return balance;
}

describe("Cross-chain ERC20 Test", () => {
  it("Cross-Chain Operations via Relay", async () => {
    const { secrets } = Web3FunctionLoader.load(w3fName, w3fRootDir);
    const privateKey = secrets["PRIVATE_KEY"];

    const arbitrumRpc = process.env.ARBITRUM_SEPOLIA_URL;
    const optimismRpc = process.env.OPTIMISM_SEPOLIA_URL;
    const arbitrumProvider = new JsonRpcProvider(arbitrumRpc);
    const optimismProvider = new JsonRpcProvider(optimismRpc);
    const arbitrumSigner = new Wallet(privateKey, arbitrumProvider);
    const optimismSigner = new Wallet(privateKey, optimismProvider);
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
        CONTRACT_ADDRESS_TO_MINT_ON: contractAddressOptimism,
        PROVIDER_TO_MINT_ON_URL: optimismRpc,
      },
      storage: {},
      gelatoArgs: {
        chainId: ARBITRUM_SEP_CHAIN_ID,
        gasPrice: parseUnits("100", "gwei").toString(),
      },
      userArgs: {},
    };

    const optimismContext = {
      secrets: {
        ...secrets,
        CONTRACT_ADDRESS_TO_MINT_ON: contractAddressArbitrum,
        PROVIDER_TO_MINT_ON_URL: arbitrumRpc,
      },
      storage: {},
      gelatoArgs: {
        chainId: OPTIMISM_SEP_CHAIN_ID,
        gasPrice: parseUnits("100", "gwei").toString(),
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
      formatEther(initialBalanceArbitrum)
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
      formatEther(afterMintBalanceArbitrum)
    );
    expect(afterMintBalanceArbitrum).to.equal(
      initialBalanceArbitrum + parseEther(AMOUNT_TO_MINT).toBigInt()
    );

    // 2. Burn tokens on Arbitrum
    const arbitrumBurnReceipt = await burnTokens({
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
      formatEther(afterBurnBalanceArbitrum)
    );
    expect(afterBurnBalanceArbitrum).to.equal(
      afterMintBalanceArbitrum - parseEther(AMOUNT_TO_BURN).toBigInt()
    );
    const arbitrumBurnLog = await getBurnEventLog({
      contractAddress: contractAddressArbitrum,
      blockHash: arbitrumBurnReceipt?.blockHash || "",
      provider: arbitrumProvider,
    });

    // 3. Execute the gelato function on Arbitrum as listener
    const initialBalanceOptimism = await checkBalance({
      contractAddress: contractAddressOptimism,
      provider: optimismProvider,
      address: ownerAddress,
    });
    console.log(
      "Initial Optimism balance:",
      formatEther(initialBalanceOptimism)
    );

    const { result: arbitrumRunRes } = await runWeb3Function(
      w3fPath,
      { ...arbitrumContext, log: arbitrumBurnLog },
      [arbitrumRpc || "", optimismRpc || ""]
    );
    expect(arbitrumRunRes.canExec).to.be.false;
    // sleep to not exceed the rate limit on relay
    await sleep(WAIT_TIME_AFTER_FUNCTION_EXECUTION);

    const afterRelayBalanceOptimism = await checkBalance({
      contractAddress: contractAddressOptimism,
      provider: optimismProvider,
      address: ownerAddress,
    });
    console.log(
      "Balance after cross-chain relay on Optimism:",
      formatEther(afterRelayBalanceOptimism)
    );
    expect(afterRelayBalanceOptimism).to.equal(
      initialBalanceOptimism + parseEther(AMOUNT_TO_BURN).toBigInt()
    );

    // 5. Burn tokens on Optimism
    const optimismBurnReceipt = await burnTokens({
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
      formatEther(afterBurnBalanceOptimism)
    );
    expect(afterBurnBalanceOptimism).to.equal(
      afterRelayBalanceOptimism - parseEther(AMOUNT_TO_BURN).toBigInt()
    );

    const optimismBurnLog = await getBurnEventLog({
      contractAddress: contractAddressOptimism,
      blockHash: optimismBurnReceipt?.blockHash || "",
      provider: optimismProvider,
    });

    // 6. Execute the gelato function on Optimism as listener
    const { result: optimismRunRes } = await runWeb3Function(
      w3fPath,
      { ...optimismContext, log: optimismBurnLog },
      [arbitrumRpc || "", optimismRpc || ""]
    );
    expect(optimismRunRes.canExec).to.be.false;
    // Wait to not exceed the rate limit
    await sleep(WAIT_TIME_AFTER_FUNCTION_EXECUTION);

    const finalBalanceArbitrum = await checkBalance({
      contractAddress: contractAddressArbitrum,
      provider: arbitrumProvider,
      address: ownerAddress,
    });
    console.log(
      "Final Arbitrum balance after cross-chain relay:",
      formatEther(finalBalanceArbitrum)
    );
    expect(finalBalanceArbitrum).to.equal(
      afterBurnBalanceArbitrum + parseEther(AMOUNT_TO_BURN).toBigInt()
    );
  });
});
