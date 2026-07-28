import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { getCurrentUser } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const f = createUploadthing();

/**
 * Upload routes.
 *
 * Authorisation runs in `middleware`, before any bytes are accepted — an
 * unauthenticated or under-privileged caller never gets a presigned URL. The
 * declared `image` type and size ceiling are enforced by UploadThing itself, so
 * a renamed executable cannot be pushed through as a photo.
 */
export const uploadRouter = {
  vehicleImage: f({
    image: { maxFileSize: "8MB", maxFileCount: 20 },
  })
    .middleware(async () => {
      const user = await getCurrentUser();
      if (!user) throw new UploadThingError("Não autenticado");

      if (!hasPermission(user.role, "vehicle:update")) {
        throw new UploadThingError("Sem permissão para enviar imagens");
      }

      const limited = checkRateLimit(`upload:${user.id}`, RATE_LIMITS.upload);
      if (!limited.success) {
        throw new UploadThingError("Muitos envios. Aguarde alguns instantes.");
      }

      return { userId: user.id, organizationId: user.organizationId };
    })
    .onUploadComplete(async ({ file }) => {
      // Returned to the client so the form can attach the file to the vehicle.
      return { url: file.url, key: file.key, name: file.name };
    }),

  brandAsset: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const user = await getCurrentUser();
      if (!user) throw new UploadThingError("Não autenticado");
      if (!hasPermission(user.role, "settings:update")) {
        throw new UploadThingError("Sem permissão");
      }
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file }) => ({ url: file.url, key: file.key })),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
