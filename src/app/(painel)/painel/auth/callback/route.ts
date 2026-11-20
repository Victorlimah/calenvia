import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/paths";
import { shouldRejectOAuthSignup, signupMode } from "@/lib/config/access";
import { checkTeamInvitePath } from "@/lib/config/access-server";
import { appUrl } from "@/lib/hosts";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Retorno do Google, da confirmação de e-mail e da recuperação de senha. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // CAL-135: no modo convite, o Google não cria conta nova. Conta que acabou de nascer sem
      // negócio e sem convite da equipe é apagada e a pessoa volta ao login com o aviso.
      const user = data.user;
      if (user && signupMode() === "invite") {
        const admin = createSupabaseAdminClient();
        const { count } = await admin
          .from("business_members")
          .select("user_id", { count: "exact", head: true })
          .eq("user_id", user.id);
        const team = await checkTeamInvitePath(next);
        if (
          shouldRejectOAuthSignup({
            mode: "invite",
            userCreatedAt: user.created_at,
            hasAnyMembership: (count ?? 0) > 0,
            hasValidTeamInvite: team.valid,
          })
        ) {
          await supabase.auth.signOut();
          await admin.auth.admin.deleteUser(user.id);
          return NextResponse.redirect(appUrl("/entrar?erro=convite"));
        }
      }
      return NextResponse.redirect(appUrl(next));
    }
  }
  return NextResponse.redirect(appUrl("/entrar?erro=link"));
}
