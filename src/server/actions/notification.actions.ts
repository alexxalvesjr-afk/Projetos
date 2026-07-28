"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { createAction } from "@/lib/safe-action";

export const markNotificationRead = createAction({
  input: z.object({ id: z.string().cuid() }),
  // Reading a notification is not an audited business event.
  rateLimit: false,
  async handler({ input, ctx }) {
    await db.notification.updateMany({
      // Scoped to the owner so one user cannot dismiss another's alerts.
      where: { id: input.id, userId: ctx.user.id },
      data: { read: true },
    });
    revalidatePath("/", "layout");
    return { id: input.id };
  },
});

export const markAllNotificationsRead = createAction({
  rateLimit: false,
  async handler({ ctx }) {
    const result = await db.notification.updateMany({
      where: { userId: ctx.user.id, read: false },
      data: { read: true },
    });
    revalidatePath("/", "layout");
    return { count: result.count };
  },
});
