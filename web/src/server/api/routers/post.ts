import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { mintTokensUsingWallet } from "~/server/transactions";

export const postRouter = createTRPCRouter({
  mintTokens: publicProcedure
    .input(
      z.object({
        amount: z.string(),
        recipient: z.string(),
        chain: z.union([z.literal("arbitrum"), z.literal("optimism")]),
      }),
    )
    .mutation(async ({ input }) => {
      const { amount, recipient, chain } = input;

      const res = await mintTokensUsingWallet({ recipient, amount, chain });
      return { res };
    }),
});
