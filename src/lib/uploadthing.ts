import {
  generateReactHelpers,
  generateUploadDropzone,
} from "@uploadthing/react";

import type { UploadRouter } from "@/app/api/uploadthing/core";

export const { useUploadThing, uploadFiles } =
  generateReactHelpers<UploadRouter>();

export const UploadDropzone = generateUploadDropzone<UploadRouter>();

/**
 * UploadThing needs a project token. When it is absent (fresh clone, local
 * demo, CI) the gallery falls back to accepting image URLs instead of failing
 * with an opaque network error.
 */
export const isUploadConfigured = Boolean(
  process.env.NEXT_PUBLIC_UPLOADTHING_ENABLED === "true",
);
