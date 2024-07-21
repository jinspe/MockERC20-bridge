import { api } from "~/utils/api";
import { useWeb3Provider } from "./Web3Provider";
import { useState } from "react";

const AMOUNT_TO_MINT = "100";

export default function MintTokens() {
  const { publicKey, currentChain } = useWeb3Provider();

  const [mintTransactionHash, setMintTransactionHash] =
    useState<`0x${string}`>();

  const mintTokensUsingWallet = api.post.mintTokens.useMutation({
    onSuccess: (data) => {
      setMintTransactionHash(data.res);
    },
  });

  const canMint = publicKey && currentChain !== "other";

  const isStepValid = canMint && mintTokensUsingWallet.isSuccess;

  return (
    <div>
      <p className={"text-lg font-medium" + (isStepValid && " text-green-600")}>
        3. Mint {AMOUNT_TO_MINT} tokens
      </p>
      <button
        className="btn-primary"
        disabled={!canMint || mintTokensUsingWallet.isPending}
        onClick={() => {
          if (!publicKey) return;
          mintTokensUsingWallet.mutate({
            amount: AMOUNT_TO_MINT,
            recipient: publicKey,
            chain:
              currentChain === "ARBITRUM_SEPOLIA" ? "arbitrum" : "optimism",
          });
        }}
      >
        Mint {AMOUNT_TO_MINT} tokens on {currentChain}
      </button>
      {mintTransactionHash && (
        <p className="break-all">Minted with hash: {mintTransactionHash}</p>
      )}
    </div>
  );
}
