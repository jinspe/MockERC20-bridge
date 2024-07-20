import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import {
  CallWithERC2771Request,
  ERC2771Type,
  GelatoRelay,
} from "@gelatonetwork/relay-sdk";
import { ethers } from "ethers";
import { Contract } from "@ethersproject/contracts";
import { Log, JsonRpcProvider } from "@ethersproject/providers";

const relay = new GelatoRelay();

interface BurnEvent {
  address: string;
  amount: ethers.BigNumberish;
  block: string;
}

const BURN_EVENT_NAME = "TokensBurned";
const TOKEN_ABI = [
  "function mint(address to, uint256 amount)",
  "event TokensBurned(address indexed account, uint256 amount)",
];

const LAST_PROCESSED_BLOCK_STORAGE_KEY_ARBITRUM = "lastProcessedBlockArbitrum";
const LAST_PROCESSED_BLOCK_STORAGE_KEY_OPTIMISM = "lastProcessedBlockOptimism";
const MAX_RANGE = 500; // limit range of events to comply with rpc providers
const MAX_REQUESTS = 50; // limit number of requests on every execution to avoid hitting timeout
const DEFAULT_LAST_BLOCK_OFFSET = 2000;

Web3Function.onRun(async (context: Web3FunctionContext) => {
  // 1. Get the secrets and storage
  const { storage, secrets } = context;

  async function getSecretOrThrow(key: string): Promise<string> {
    const value = await secrets.get(key);
    if (!value) throw new Error(`Secret ${key} is not defined`);
    return value;
  }
  const relayAPIKey = await getSecretOrThrow("RELAY_API_KEY");
  const privateKey = await getSecretOrThrow("PRIVATE_KEY");
  const chainListened = await getSecretOrThrow("CHAIN_LISTENED");
  if (
    chainListened !== "arbitrumSepolia" &&
    chainListened !== "optimismSepolia"
  ) {
    throw new Error(
      "Invalid chain listened, use arbitrumSepolia or optimismSepolia"
    );
  }
  const storageKey =
    chainListened === "arbitrumSepolia"
      ? LAST_PROCESSED_BLOCK_STORAGE_KEY_ARBITRUM
      : LAST_PROCESSED_BLOCK_STORAGE_KEY_OPTIMISM;
  const lastProcessedBlock = await storage.get(storageKey);
  const chainSettings = {
    arbitrumSepolia: {
      contractAddress: await getSecretOrThrow("ARBITRUM_SEP_CONTRACT_ADDRESS"),
      rpcUrl: await getSecretOrThrow("ARBITRUM_SEP_RPC_URL"),
    },
    optimismSepolia: {
      contractAddress: await getSecretOrThrow("OPTIMISM_SEP_CONTRACT_ADDRESS"),
      rpcUrl: await getSecretOrThrow("OPTIMISM_SEP_RPC_URL"),
    },
  };
  const chainToMintOn =
    chainListened === "arbitrumSepolia" ? "optimismSepolia" : "arbitrumSepolia";

  const { contractAddress: burnContractAddress, rpcUrl: burnRPCUrl } =
    chainSettings[chainListened];
  const { contractAddress: mintContractAddress, rpcUrl: mintRPCUrl } =
    chainSettings[chainToMintOn];

  console.log(
    `Chain listened for burn: ${chainListened}, chain to mint on: ${chainToMintOn}`
  );
  // log contract addresses
  console.log(
    `Burn contract address: ${burnContractAddress} on ${chainListened}`
  );
  console.log(
    `Mint contract address: ${mintContractAddress} on ${chainToMintOn}`
  );

  // 2. Get the burn events from the chain we are listening to
  let burnEvents: BurnEvent[] = [];
  let newLastProcessedBlocked = lastProcessedBlock;

  try {
    const eventResults = await getBurnEvents({
      rpcUrl: burnRPCUrl,
      contractAddress: burnContractAddress,
      lastProcessedBlock,
    });
    burnEvents = eventResults.burnEvents;
    newLastProcessedBlocked = eventResults.newLastProcessedBlocked;
  } catch (error) {
    let message = `Rpc call failed: Failed to fetch logs from block ${lastProcessedBlock}`;
    if (error instanceof Error) {
      message += `: ${error.message}`;
    }
    // TODO: maybe remove log Not sure yet how error logs are displayed in Gelato
    console.error(message);
    return {
      canExec: false,
      message,
    };
  }
  if (burnEvents.length === 0) {
    await storage.set(storageKey, newLastProcessedBlocked);
    console.log(
      `No burn events found. Processed blocks from ${lastProcessedBlock} to ${newLastProcessedBlocked}`
    );
    return {
      canExec: false,
      message: `No burn events found. Processed blocks from ${lastProcessedBlock} to ${newLastProcessedBlocked}`,
    };
  }
  console.log(`Found ${burnEvents.length} burn events`);
  burnEvents.forEach(({ address, amount }, i) => {
    console.log(`${i}. Burn event: ${address} burned ${amount.toString()}`);
  });

  // 3. Mint tokens to the addresses that burned them

  let sucessfulMintCount = 0;
  try {
    const mintResults = await minTokens({
      burnEvents,
      rpcUrl: mintRPCUrl,
      contractAddress: mintContractAddress,
      relayAPIKey,
      privateKey,
    });
    sucessfulMintCount = mintResults.sucessfulMintCount;
    if (mintResults.latestBlockBeforeFailure) {
      newLastProcessedBlocked = mintResults.latestBlockBeforeFailure;
    }
  } catch (error) {
    let message = `Failed to mint tokens`;
    if (error instanceof Error) {
      message += `: ${error.message}`;
    }
    console.error(message);
    return {
      canExec: false,
      message,
    };
  }

  await storage.set(storageKey, newLastProcessedBlocked);
  return {
    canExec: true,
    callData: [],
    message: `Found ${burnEvents.length} burn events. Minted ${sucessfulMintCount} (${sucessfulMintCount}/${burnEvents.length}). Processed blocks from ${lastProcessedBlock} to ${newLastProcessedBlocked}`,
  };
});

async function getBurnEvents({
  rpcUrl,
  contractAddress,
  lastProcessedBlock,
}: {
  rpcUrl: string;
  contractAddress: string;
  lastProcessedBlock?: string;
}): Promise<{
  burnEvents: BurnEvent[];
  newLastProcessedBlocked: string;
}> {
  const provider = new JsonRpcProvider(rpcUrl);
  const tokenContract = new Contract(contractAddress, TOKEN_ABI, provider);

  const topics = [tokenContract.interface.getEventTopic(BURN_EVENT_NAME)];
  const currentBlock = await provider.getBlockNumber();

  // Retrieve last processed block number
  let lastBlock = lastProcessedBlock
    ? parseInt(lastProcessedBlock)
    : currentBlock - DEFAULT_LAST_BLOCK_OFFSET;

  // Fetch recent logs
  const logs: Log[] = [];
  let nbRequests = 0;

  while (lastBlock < currentBlock && nbRequests < MAX_REQUESTS) {
    nbRequests++;
    const fromBlock = lastBlock + 1;
    const toBlock = Math.min(fromBlock + MAX_RANGE, currentBlock);
    console.log(`Fetching logs from block ${fromBlock} to ${toBlock}`);

    const eventFilter = {
      address: contractAddress,
      topics,
      fromBlock,
      toBlock,
    };
    const result = await provider.getLogs(eventFilter);
    logs.push(...result);
    lastBlock = toBlock;
  }

  // Parse burn events and log them
  let burnEvents: BurnEvent[] = [];
  for (const log of logs) {
    const event = tokenContract.interface.parseLog(log);
    if (event.name === BURN_EVENT_NAME) {
      const [account, amount] = event.args;
      burnEvents.push({
        address: account,
        amount,
        block: log.blockNumber.toString(),
      });
    }
  }

  return { burnEvents, newLastProcessedBlocked: lastBlock.toString() };
}

async function minTokens({
  burnEvents,
  relayAPIKey,
  rpcUrl,
  contractAddress,
  privateKey,
}: {
  burnEvents: BurnEvent[];
  relayAPIKey: string;
  rpcUrl: string;
  contractAddress: string;
  privateKey: string;
}): Promise<{
  sucessfulMintCount: number;
  latestBlockBeforeFailure?: string;
}> {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const chainId = (await provider.getNetwork()).chainId;
  const signer = new ethers.Wallet(privateKey, provider);
  const user = await signer.getAddress();

  let latestBlockBeforeFailure: string | undefined;
  let sucessfulMintCount = 0;

  // Create the transactions sequentially in case one fails
  for (const burnEvent of burnEvents) {
    try {
      await mintTokenToAddress({
        burnEvent,
        contractAddress,
        chainId,
        relayAPIKey,
        signer,
        signerAddress: user,
        sequenceNumber: sucessfulMintCount,
      });
      latestBlockBeforeFailure = burnEvent.block;
      sucessfulMintCount += 1;
    } catch (error) {
      let message = `Failed to mint ${burnEvent.amount.toString()} tokens to ${
        burnEvent.address
      }`;
      if (error instanceof Error) {
        message += `: ${error.message}`;
      }
      console.error(message);
      return {
        sucessfulMintCount,
        latestBlockBeforeFailure,
      };
    }
  }

  return { sucessfulMintCount };
}

async function mintTokenToAddress({
  burnEvent,
  contractAddress,
  chainId,
  relayAPIKey,
  signer,
  signerAddress,
  sequenceNumber,
}: {
  burnEvent: BurnEvent;
  chainId: bigint;
  relayAPIKey: string;
  signer: ethers.Signer;
  signerAddress: string;
  contractAddress: string;
  sequenceNumber: number;
}) {
  const contract = new ethers.Contract(contractAddress, TOKEN_ABI, signer);

  const { data } = await contract.mint.populateTransaction(
    burnEvent.address,
    BigInt(burnEvent.amount)
  );
  const request: CallWithERC2771Request = {
    chainId,
    target: contractAddress,
    data: data,
    user: signerAddress,
  };
  const { struct, signature } = await relay.getSignatureDataERC2771(
    request,
    signer as any,
    ERC2771Type.SponsoredCall
  );
  const response = await relay.sponsoredCallERC2771WithSignature(
    struct,
    signature,
    relayAPIKey
  );
  console.log(
    `${sequenceNumber}. Sent mint task ${burnEvent.amount.toString()} tokens to ${
      burnEvent.address
    } with taskId ${
      response.taskId
    }, link: https://relay.gelato.digital/tasks/status/${response.taskId}`
  );
}
