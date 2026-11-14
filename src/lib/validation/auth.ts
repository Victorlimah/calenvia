import { z } from "zod";

const email = z
  .string()
  .trim()
  .min(1, "Informe seu e-mail.")
  .email("Esse e-mail não parece válido.")
  .transform((v) => v.toLowerCase());

const password = z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.").max(72);

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Informe sua senha."),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(80),
  email,
  password,
});

export const forgotPasswordSchema = z.object({ email });

export const newPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    message: "As senhas não são iguais.",
    path: ["confirm"],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

/** Traduz erros do Supabase Auth para mensagens simples. */
export function authErrorMessage(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Já existe uma conta com esse e-mail. Tente entrar.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail pelo link que enviamos.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas. Espere um pouco e tente de novo.";
  if (m.includes("provider is not enabled") || m.includes("unsupported provider"))
    return "Entrar com Google ainda não está disponível.";
  if (m.includes("should be different")) return "A nova senha precisa ser diferente da atual.";
  if (m.includes("weak") || m.includes("password should be"))
    return "Escolha uma senha mais forte.";
  return "Não foi possível concluir agora. Tente de novo.";
}
