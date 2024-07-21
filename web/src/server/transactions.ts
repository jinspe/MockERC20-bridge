import {
  ARBITRUM_SEP_CONTRACT_ADDRESS,
  OPTIMISM_SEP_CONTRACT_ADDRESS,
  contractAbi,
} from "../utils/contracts";
import { createWalletClient, http, parseAbi, parseEther } from "viem";

import { privateKeyToAccount } from "viem/accounts";
import { optimismSepolia, arbitrumSepolia } from "viem/chains";
import { env } from "~/env";

export async function mintTokensUsingWallet({
  recipient,
  amount,
  chain,
}: {
  recipient: string;
  amount: string;
  chain: "arbitrum" | "optimism";
}) {
  try {
    const privateKey = env.PRIVATE_KEY;
    const account = privateKeyToAccount(`0x${privateKey}`);

    const chainSource =
      chain === "arbitrum" ? arbitrumSepolia : optimismSepolia;
    const rpcUrl =
      chain === "arbitrum"
        ? env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_URL
        : env.NEXT_PUBLIC_OPTIMISM_SEPOLIA_URL;
    const contractAddress =
      chain === "arbitrum"
        ? ARBITRUM_SEP_CONTRACT_ADDRESS
        : OPTIMISM_SEP_CONTRACT_ADDRESS;

    const client = createWalletClient({
      account,
      chain: chainSource,
      transport: http(rpcUrl),
    });

    const parsedAmount = parseEther(amount);

    const hash = await client.writeContract({
      address: contractAddress,
      abi: parseAbi(contractAbi),
      functionName: "mint",
      args: [recipient, parsedAmount],
    });

    console.log("Mint transaction sent:", hash);
    return hash;
  } catch (error) {
    console.error("Mint transaction failed:", error);
  }
}
