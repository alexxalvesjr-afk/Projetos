import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Informe o e-mail")
    .email("E-mail inválido")
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, "Informe a senha"),
});

/**
 * Registration creates both the organization and its OWNER in one transaction,
 * so the schema carries the company fields alongside the user's.
 */
export const registerSchema = z
  .object({
    organizationName: z
      .string()
      .min(2, "Informe o nome da loja")
      .max(80, "Máximo de 80 caracteres")
      .trim(),
    name: z
      .string()
      .min(2, "Informe seu nome")
      .max(80, "Máximo de 80 caracteres")
      .trim(),
    email: z
      .string()
      .email("E-mail inválido")
      .transform((v) => v.toLowerCase().trim()),
    password: z
      .string()
      .min(8, "Mínimo de 8 caracteres")
      .max(72, "Máximo de 72 caracteres")
      .regex(/[a-z]/, "Inclua ao menos uma letra minúscula")
      .regex(/[A-Z]/, "Inclua ao menos uma letra maiúscula")
      .regex(/\d/, "Inclua ao menos um número"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual"),
    newPassword: z
      .string()
      .min(8, "Mínimo de 8 caracteres")
      .max(72, "Máximo de 72 caracteres")
      .regex(/[a-z]/, "Inclua ao menos uma letra minúscula")
      .regex(/[A-Z]/, "Inclua ao menos uma letra maiúscula")
      .regex(/\d/, "Inclua ao menos um número"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
