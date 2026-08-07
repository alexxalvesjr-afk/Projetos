"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAction } from "@/lib/safe-action";
import {
  chooseAccount,
  disconnect,
  syncProvider,
} from "@/server/services/ads.service";

const providerSchema = z.object({
  provider: z.enum(["META_ADS", "GOOGLE_ADS"]),
});

/**
 * Puxa de novo o desempenho das campanhas.
 *
 * A conexão já sincroniza sozinha ao ser criada; este botão existe para quem
 * acabou de mexer na campanha e quer ver o número agora, sem esperar.
 */
export const syncAdAccount = createAction({
  input: providerSchema,
  permission: "campaign:manage",
  audit: { action: "integration.sync", entity: "AdAccountConnection" },
  async handler({ input, ctx }) {
    const result = await syncProvider(ctx.user.organizationId, input.provider);
    revalidatePath("/marketing");
    return result;
  },
});

export const disconnectAdAccount = createAction({
  input: providerSchema,
  permission: "campaign:manage",
  audit: { action: "integration.disconnect", entity: "AdAccountConnection" },
  async handler({ input, ctx }) {
    await disconnect(ctx.user.organizationId, input.provider);
    revalidatePath("/marketing");
    // As campanhas já sincronizadas ficam: são histórico de investimento, e
    // apagá-las mudaria o ROAS dos meses passados por causa de um clique em
    // "desconectar".
    return { provider: input.provider };
  },
});

export const chooseAdAccount = createAction({
  input: providerSchema.extend({ accountId: z.string().min(1) }),
  permission: "campaign:manage",
  audit: { action: "integration.choose_account", entity: "AdAccountConnection" },
  async handler({ input, ctx }) {
    await chooseAccount(
      ctx.user.organizationId,
      input.provider,
      input.accountId,
    );

    // Escolher a conta é o passo que faltava para haver o que mostrar; puxar
    // os números em seguida evita um segundo clique previsível.
    await syncProvider(ctx.user.organizationId, input.provider);
    revalidatePath("/marketing");
    return { provider: input.provider };
  },
});
