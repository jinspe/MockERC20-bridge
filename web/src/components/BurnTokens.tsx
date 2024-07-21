import {
  ARBITRUM_SEP_CONTRACT_ADDRESS,
  contractAbi,
  OPTIMISM_SEP_CONTRACT_ADDRESS,
} from "~/utils/contracts";
import { useWeb3Provider } from "./Web3Provider";
import { parseAbi, parseEther } from "viem";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

const AMOUNT_TO_BURN = "50";

export default function BurnTokens() {
  const { publicKey, currentChain, publicClient, walletClient } =
    useWeb3Provider();

  const [burnTransactionHash, setBurnTransactionHash] =
    useState<`0x${string}`>();

  async function handBurnTokens() {
    if (
      !publicKey ||
      !publicClient ||
      !walletClient ||
      currentChain === "other"
    ) {
      throw new Error(
        "Missing publicKey, publicClient or walletClient or chain",
      );
    }
    const contractAddress =
      currentChain === "ARBITRUM_SEPOLIA"
        ? ARBITRUM_SEP_CONTRACT_ADDRESS
        : OPTIMISM_SEP_CONTRACT_ADDRESS;

    const parsedAmount = parseEther("50");

    console.log({
      contractAddress,
      parsedAmount,
      publicKey,
    });
    const { request } = await publicClient.simulateContract({
      abi: parseAbi(contractAbi),
      account: publicKey,
      address: contractAddress,
      functionName: "burn",
      args: [parsedAmount],
    });

    const hash = await walletClient.writeContract(request);
    const receiptTransaction = await publicClient.waitForTransactionReceipt({
      hash,
    });
    console.log("Burn receipt", receiptTransaction);
    return receiptTransaction.transactionHash;
  }

  const burnTokensMutation = useMutation({
    mutationFn: handBurnTokens,
    onError: (error) => {
      console.error("Error burning tokens:", error);
    },
    onSuccess: (data) => {
      setBurnTransactionHash(data);
    },
  });

  const canBurn = publicKey && currentChain !== "other";
  const isStepValid = canBurn && burnTokensMutation.isSuccess;

  return (
    <div>
      <p className={"text-lg font-medium" + (isStepValid && " text-green-600")}>
        4. Burn {AMOUNT_TO_BURN} tokens, make sure you have enough for the gas
      </p>
      <button
        className="btn-primary"
        disabled={!canBurn || burnTokensMutation.isPending}
        onClick={() => {
          burnTokensMutation.mutate();
        }}
      >
        Burn {AMOUNT_TO_BURN} tokens on {currentChain}
      </button>
      {burnTransactionHash && (
        <p className="break-all">Burned with hash: {burnTransactionHash}</p>
      )}
    </div>
  );
}
