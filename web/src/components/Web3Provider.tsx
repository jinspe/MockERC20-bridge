import { useMutation } from "@tanstack/react-query";
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createWalletClient,
  custom,
  type WalletClient,
  type Address,
  type PublicClient,
  createPublicClient,
  http,
} from "viem";
import { arbitrumSepolia, optimismSepolia } from "viem/chains";
import "viem/window";
import { env } from "~/env";

const NETWORKS = {
  ARBITRUM_SEPOLIA: arbitrumSepolia,
  OPTIMISM_SEPOLIA: optimismSepolia,
};
type Network = keyof typeof NETWORKS;

interface Web3ContextProps {
  publicKey: Address | null;
  handleConnectWallet: () => void;
  isLoading: boolean;
  isConnecting: boolean;
  walletClient: WalletClient | null;
  publicClient: PublicClient | null;
  // Network specific
  switchNetwork: (network: Network) => void;
  isSwitchingNetwork: boolean;
  currentChain: Network | "other";
}

// FIXME: use wallet connect, wagmi or other more friendly providers
const NO_WALLET_DETECTED_MESSAGE =
  "Wallet not detected. Please install MetaMask and refresh the page.";

const Web3Context = createContext<Web3ContextProps | undefined>(undefined);

export default function Web3Provider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [publicKey, setPublicKey] = useState<Address | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [publicClient, setPublicClient] = useState<PublicClient | null>(null);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [selectedNetwork, setSelectedNetwork] =
    useState<Network>("ARBITRUM_SEPOLIA");

  const [currentChain, setCurrentChain] = useState<Network | "other">("other");

  function createViemClients() {
    try {
      setIsLoading(true);
      if (!window.ethereum) {
        console.error(NO_WALLET_DETECTED_MESSAGE);
        return;
      }
      const networkConfig = NETWORKS[selectedNetwork];

      const walletClient: WalletClient = createWalletClient({
        chain: networkConfig,
        transport: custom(window.ethereum),
      });
      setWalletClient(walletClient);

      const publicClient: PublicClient = createPublicClient({
        transport: http(
          selectedNetwork === "OPTIMISM_SEPOLIA"
            ? env.NEXT_PUBLIC_OPTIMISM_SEPOLIA_URL
            : env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_URL,
        ),
      });
      setPublicClient(publicClient);

      walletClient
        .getAddresses()
        .then(async (addresses) => {
          setPublicKey(addresses[0] ?? null);
        })
        .catch((error) => {
          console.error("Error connecting to Wallet:", error);
        });
      walletClient.getChainId().then(
        (chainId) => {
          handleChainChanged(chainId.toString(16));
        },
        (error) => {
          console.error("Error getting chainId:", error);
        },
      );
    } catch (error) {
      console.error("Error creating Viem clients:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleChainChanged = (_chainId: string) => {
    // Convert chainId to a number or format that matches your NETWORKS keys
    const chainId = parseInt(_chainId, 16);
    const matchedNetworkKey: Network | undefined = Object.entries(
      NETWORKS,
    ).find(([_, value]) => value.id === chainId)?.[0] as Network | undefined;

    if (matchedNetworkKey) {
      setCurrentChain(matchedNetworkKey); // Set to the matched network object if found
      setSelectedNetwork(matchedNetworkKey);
    } else {
      setCurrentChain("other"); // Set to "other" if no matching network is found
    }
  };

  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      console.log("Accounts changed:", accounts);
      if (accounts.length === 0) {
        setPublicKey(null);
      } else {
        // pass
      }
    };

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);
    }

    // Cleanup function to remove listeners when the component unmounts
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged,
        );
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  async function connectWallet() {
    if (!walletClient) {
      alert(NO_WALLET_DETECTED_MESSAGE);
      throw new Error(NO_WALLET_DETECTED_MESSAGE);
    }
    const addresses = await walletClient.requestAddresses();
    // REVIEW : only take the first address for now
    const publicKey = addresses[0] ?? null;
    return publicKey;
  }
  const connectWalletMutation = useMutation({
    mutationFn: connectWallet,
    onError: (error) => {
      console.error("Error connecting to Wallet:", error);
    },
    onSuccess: (publicKey) => {
      setPublicKey(publicKey);
    },
  });

  useEffect(() => {
    createViemClients();
  }, [selectedNetwork]);

  async function handleSwitchNetwork(network: keyof typeof NETWORKS) {
    if (!walletClient) {
      throw new Error("Wallet not detected.");
    }
    const networkConfig = NETWORKS[network];

    try {
      // Attempt to switch to the network
      await walletClient.switchChain(networkConfig);
      setSelectedNetwork(network);
    } catch (error: any) {
      // Check for specific error code 4902 (Unrecognized chain ID)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code === 4902) {
        // Prompt user to add the network to MetaMask
        await walletClient.addChain({
          chain: networkConfig,
        });
      } else {
        throw error;
      }
    }
    await walletClient.switchChain(networkConfig);
    setSelectedNetwork(network);
  }
  const handleSwitchNetworkMutation = useMutation({
    mutationFn: handleSwitchNetwork,
    onError: (error) => {
      console.error("Error switching network:", error);
    },
  });

  const contextValue: Web3ContextProps = {
    publicKey,
    handleConnectWallet: () => connectWalletMutation.mutate(),
    isLoading,
    isConnecting: connectWalletMutation.isPending,
    walletClient,
    publicClient,
    switchNetwork: handleSwitchNetworkMutation.mutate,
    isSwitchingNetwork: handleSwitchNetworkMutation.isPending,
    currentChain,
  };

  return (
    <Web3Context.Provider value={contextValue}>{children}</Web3Context.Provider>
  );
}

export const useWeb3Provider = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3Provider must be used within its provider");
  }
  return context;
};
