/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import {
  createPublicClient,
  type PublicClient,
  http,
  type Log,
  parseAbi,
} from "viem";
import { arbitrumSepolia } from "viem/chains";
import { env } from "~/env";
import {
  ARBITRUM_SEP_CONTRACT_ADDRESS,
  OPTIMISM_SEP_CONTRACT_ADDRESS,
  contractAbi,
} from "~/utils/contracts";

const replacer = (_key: string, value: unknown): unknown =>
  typeof value === "bigint" ? value.toString() : value;

export default function ContractEventListener() {
  const [arbLogs, setArbLogs] = useState<Partial<Log>[]>([]);
  const [optLogs, setOptLogs] = useState<Partial<Log>[]>([]);
  useEffect(() => {
    if (!window.ethereum) {
      return;
    }
    const arbPublicLient: PublicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_URL),
    });
    const arbUnwatch = arbPublicLient.watchContractEvent({
      address: ARBITRUM_SEP_CONTRACT_ADDRESS,
      abi: parseAbi(contractAbi),
      onLogs: (logs) => {
        logs.forEach((log) => {
          const { topics, data, blockHash, removed, ...toKepp } = log;
          console.log(toKepp);
          setArbLogs((prevLogs) => [...prevLogs, toKepp]);
        });
      },
    });

    const optPublicLient: PublicClient = createPublicClient({
      transport: http(env.NEXT_PUBLIC_OPTIMISM_SEPOLIA_URL),
    });
    const optUnwatch = optPublicLient.watchContractEvent({
      address: OPTIMISM_SEP_CONTRACT_ADDRESS,
      abi: parseAbi(contractAbi),
      onLogs: (logs) => {
        logs.forEach((log) => {
          const { topics, data, blockHash, removed, ...toKepp } = log;
          console.log(toKepp);
          setOptLogs((prevLogs) => [...prevLogs, toKepp]);
        });
      },
    });

    return () => {
      arbUnwatch();
      optUnwatch();
    };
  }, []);

  return (
    <div className="mt-20">
      <h1 className="text-2xl font-semibold">Contract Event Listner</h1>
      <div className="flex flex-wrap gap-5">
        <div className="max-w-sm flex-grow">
          <h2 className="font-semibold">Arbitrum Sepolia Logs</h2>
          <div className="w-full space-y-2 border-2 border-blue-500 p-3 text-xs">
            {arbLogs.map((log, index) => (
              <div key={index}>
                <pre className="overflow-y-auto border border-gray-700">
                  {JSON.stringify(log, replacer, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
        <div className="max-w-sm flex-grow">
          <h2 className="font-semibold">Optimism Sepolia Logs</h2>
          <div className="space-y-2 text-wrap border-2 border-orange-500 p-3 text-xs">
            {optLogs.map((log, index) => (
              <div key={index}>
                <pre className="overflow-y-auto border border-gray-700">
                  {JSON.stringify(log, replacer, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
