import { useWeb3Provider } from "./Web3Provider";

export default function ConnectWallet() {
  const { publicKey, isLoading, isConnecting, handleConnectWallet } =
    useWeb3Provider();

  if (isLoading) {
    return <p>Loading...</p>;
  }
  return (
    <div>
      <p
        className={
          "text-lg font-medium" +
          (publicKey ? " text-green-600" : " text-red-600")
        }
      >
        1. Connect your wallet
      </p>
      {publicKey ? (
        <p className="font-medium">Connected: {publicKey}</p>
      ) : (
        <button
          className="btn-primary"
          onClick={handleConnectWallet}
          disabled={isConnecting}
        >
          Connect your wallet
        </button>
      )}
    </div>
  );
}
