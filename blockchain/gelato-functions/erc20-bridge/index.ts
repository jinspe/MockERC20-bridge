import {
  Web3Function,
  Web3FunctionEventContext,
} from "@gelatonetwork/web3-functions-sdk";
import {
  CallWithERC2771Request,
  ERC2771Type,
  GelatoRelay,
} from "@gelatonetwork/relay-sdk";
import { Interface } from "@ethersproject/abi";
import { formatEther } from "@ethersproject/units";
import { ethers } from "ethers";

const relay = new GelatoRelay();

const BURN_EVENT_NAME = "TokensBurned";
const TOKEN_ABI = [
  "function mint(address to, uint256 amount)",
  "event TokensBurned(address indexed account, uint256 amount)",
];

// Documentation ref: https://docs.gelato.network/web3-services/web3-functions/quick-start/writing-typescript-functions/event-trigger

Web3Function.onRun(async (context: Web3FunctionEventContext) => {
  // 1. Get the secrets
  const { secrets, log } = context;
  async function getSecretOrThrow(key: string): Promise<string> {
    const value = await secrets.get(key);
    if (!value) throw new Error(`Secret ${key} is not defined`);
    return value;
  }
  const relayAPIKey = await getSecretOrThrow("RELAY_API_KEY");
  const privateKey = await getSecretOrThrow("PRIVATE_KEY");
  const providerToMintOnUrl = await getSecretOrThrow("PROVIDER_TO_MINT_ON_URL");
  const contractToMintOn = await getSecretOrThrow(
    `CONTRACT_ADDRESS_TO_MINT_ON`
  );

  const provider = new ethers.JsonRpcProvider(providerToMintOnUrl);
  const chainId = (await provider.getNetwork()).chainId;
  console.log(`Chain to mint on: ${chainId}`);

  // 2. Parse the burn event from the logs
  const tokenABIInterface = new Interface(TOKEN_ABI);
  const parsedLogs = tokenABIInterface.parseLog(log);
  if (parsedLogs.name !== BURN_EVENT_NAME) {
    throw new Error(
      `Invalid event name: ${parsedLogs.name}, expected ${BURN_EVENT_NAME}`
    );
  }
  // expect "0x" and "1000000" in wei
  const { account: burnerAccount, amount: burnedAmount } = parsedLogs.args;

  console.log(
    `Burn event detected: ${formatEther(
      burnedAmount
    )} tokens burned by ${burnerAccount}`
  );

  // 3. Mint tokens to the address

  const signer = new ethers.Wallet(privateKey, provider);
  const signerAddress = await signer.getAddress();
  const contract = new ethers.Contract(contractToMintOn, TOKEN_ABI, signer);

  const { data } = await contract.mint.populateTransaction(
    burnerAccount,
    BigInt(burnedAmount)
  );
  const request: CallWithERC2771Request = {
    chainId: (await provider.getNetwork()).chainId,
    target: contractToMintOn,
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
    `Sent mint task ${burnedAmount} tokens to ${burnerAccount} with taskId ${response.taskId}, link: https://relay.gelato.digital/tasks/status/${response.taskId}`
  );

  return {
    canExec: false,
    message: `Minted ${burnedAmount} tokens to ${burnerAccount} on chain ${chainId}`,
  };
});
