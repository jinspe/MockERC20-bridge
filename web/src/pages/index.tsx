import Head from "next/head";
import ContractEventListener from "~/components/ContractEventListener";
import MintTokens from "~/components/MintTokens";
import ConnectWallet from "~/components/ConnectWallet";
import SelectChainToMintOn from "~/components/SelectChainToMintOn";
import BurnTokens from "~/components/BurnTokens";

export default function Home() {
  return (
    <>
      <Head>
        <title>MockERC20 Gelato Bridge Test</title>
        <meta name="description" content="MockERC20 Gelato Bridge Test" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="mx-auto max-w-5xl space-y-5 p-4">
        <h1 className="mt-10 text-center text-4xl font-bold">
          Welcome to MockERC20 Gelato Bridge Test
        </h1>
        <ConnectWallet />
        <SelectChainToMintOn />
        <MintTokens />
        <BurnTokens />

        <p>
          5. Wait for the web3function to trigger and mint the same amount of
          tokens on the other chain. Look at the logs below to see the events.
        </p>
        <ContractEventListener />
      </main>
    </>
  );
}
