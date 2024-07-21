import { useWeb3Provider } from "./Web3Provider";

export default function SelectChainToMintOn() {
  const { publicKey, isSwitchingNetwork, switchNetwork, currentChain } =
    useWeb3Provider();

  const isStepValid = publicKey && currentChain !== "other";

  const isDisabled = isSwitchingNetwork || !publicKey;

  return (
    <div>
      <p
        className={
          "text-lg font-medium" +
          (isStepValid ? " text-green-600" : " text-red-600")
        }
      >
        2. Chose you chain to mint and burn on
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          className="btn-primary"
          onClick={() => switchNetwork("OPTIMISM_SEPOLIA")}
          disabled={isDisabled || currentChain == "OPTIMISM_SEPOLIA"}
        >
          Optimism Sepolia
        </button>
        <button
          className="btn-primary"
          onClick={() => switchNetwork("ARBITRUM_SEPOLIA")}
          disabled={isDisabled || currentChain == "ARBITRUM_SEPOLIA"}
        >
          Arbitrum Sepolia
        </button>
      </div>
    </div>
  );
}
