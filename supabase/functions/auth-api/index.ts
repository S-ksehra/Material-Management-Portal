import { createClient } from "npm:@supabase/supabase-js@2.111.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SALT = "bom_salt_v1";

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${SALT}:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateOtp(): string {
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => (b % 10).toString())
    .join("");
}

function isValidPassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one digit.";
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
    return "Password must contain at least one special character.";
  return null;
}

async function logAudit(action: string, remarks: string | null, user: string) {
  try {
    await supabase.from("audit_log").insert({ action, user, remarks });
  } catch {
    // never block on audit failure
  }
}

async function findUser(identifier: string) {
  const lower = identifier.toLowerCase().trim();
  const { data: byEmail } = await supabase
    .from("app_users")
    .select("*")
    .eq("email", lower)
    .maybeSingle();
  if (byEmail) return byEmail;

  const { data: byUsername } = await supabase
    .from("app_users")
    .select("*")
    .eq("username", identifier.trim())
    .maybeSingle();
  return byUsername ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const jsonRes = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const url = new URL(req.url);
    const path = url.pathname
      .replace(/^\/functions\/v1\/auth-api\/?/, "")
      .replace(/^\/auth-api\/?/, "")
      .replace(/\/$/, "")
      .toLowerCase();
    const body = await req.json().catch(() => ({}));

    // ---------- LOGIN WITH PASSWORD ----------
    if (path === "login") {
      const { identifier, password } = body;
      if (!identifier || !password) {
        return jsonRes({ error: "User ID/Email and Password are required." }, 400);
      }

      const user = await findUser(identifier);
      if (!user) {
        await logAudit("Failed Login", `Identifier: ${identifier}`, identifier);
        return jsonRes({ error: "Invalid credentials." }, 401);
      }
      if (!user.is_active) {
        await logAudit("Failed Login", `Account inactive: ${user.email}`, user.email);
        return jsonRes({ error: "Your account is inactive. Please contact administrator." }, 403);
      }

      const hash = await hashPassword(password);
      if (hash !== user.password_hash) {
        await logAudit("Failed Login", `Wrong password: ${user.email}`, user.email);
        return jsonRes({ error: "Invalid credentials." }, 401);
      }

      await logAudit("Successful Login", `User: ${user.username} (${user.email})`, user.username);
      return jsonRes({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          is_active: user.is_active,
          must_change_password: user.must_change_password,
        },
      });
    }

    // ---------- SEND OTP ----------
    if (path === "send-otp") {
      const { identifier, purpose = "login" } = body;
      if (!identifier) {
        return jsonRes({ error: "User ID/Email is required." }, 400);
      }

      const user = await findUser(identifier);
      if (!user) {
        await logAudit("Failed OTP", `Identifier not found: ${identifier}`, identifier);
        return jsonRes({ error: "No account found with this User ID/Email." }, 404);
      }
      if (!user.is_active) {
        await logAudit("Failed OTP", `Account inactive: ${user.email}`, user.email);
        return jsonRes({ error: "Your account is inactive. Please contact administrator." }, 403);
      }

      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await supabase
        .from("otp_store")
        .update({ is_used: true })
        .eq("email", user.email)
        .eq("purpose", purpose)
        .eq("is_used", false);

      const { error: insertError } = await supabase.from("otp_store").insert({
        email: user.email,
        otp_code: otp,
        purpose,
        is_used: false,
        expires_at: expiresAt,
      });

      if (insertError) {
        return jsonRes({ error: "Failed to generate OTP. Please try again." }, 500);
      }

      const { error: emailError } = await supabase.auth.signInWithOtp({
        email: user.email,
        options: {
          emailRedirectTo: supabaseUrl,
          data: { otp_code: otp, username: user.username, purpose_label: purpose === "reset" ? "Password Reset" : "Login" },
        },
      });

      if (emailError) {
        await logAudit("OTP Generated", `User: ${user.username}, OTP sent (fallback)`, user.username);
        return jsonRes({ message: "OTP generated. Check your email.", otp, email: user.email });
      }

      await logAudit("OTP Generated", `User: ${user.username}, purpose: ${purpose}`, user.username);
      return jsonRes({ message: "OTP sent to your registered email.", email: user.email });
    }

    // ---------- VERIFY OTP ----------
    if (path === "verify-otp") {
      const { identifier, otp, purpose = "login" } = body;
      if (!identifier || !otp) {
        return jsonRes({ error: "User ID/Email and OTP are required." }, 400);
      }

      const user = await findUser(identifier);
      if (!user) {
        await logAudit("Failed OTP", `Identifier not found: ${identifier}`, identifier);
        return jsonRes({ error: "No account found." }, 404);
      }
      if (!user.is_active) {
        await logAudit("Failed OTP", `Account inactive: ${user.email}`, user.email);
        return jsonRes({ error: "Your account is inactive." }, 403);
      }

      const { data: otpRecord } = await supabase
        .from("otp_store")
        .select("*")
        .eq("email", user.email)
        .eq("purpose", purpose)
        .eq("is_used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!otpRecord) {
        await logAudit("Failed OTP", `Expired/invalid OTP: ${user.email}`, user.email);
        return jsonRes({ error: "OTP has expired or is invalid. Please request a new one." }, 401);
      }
      if (otpRecord.otp_code !== otp) {
        await logAudit("Failed OTP", `Wrong OTP: ${user.email}`, user.email);
        return jsonRes({ error: "Invalid OTP." }, 401);
      }

      await supabase.from("otp_store").update({ is_used: true }).eq("id", otpRecord.id);

      if (purpose === "login") {
        await logAudit("OTP Login", `User: ${user.username}`, user.username);
        return jsonRes({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            is_active: user.is_active,
            must_change_password: user.must_change_password,
          },
        });
      } else {
        await logAudit("OTP Verified (Reset)", `User: ${user.username}`, user.username);
        return jsonRes({ reset_token: otpRecord.id, email: user.email });
      }
    }

    // ---------- RESET PASSWORD ----------
    if (path === "reset-password") {
      const { reset_token, new_password } = body;
      if (!reset_token || !new_password) {
        return jsonRes({ error: "Reset token and new password are required." }, 400);
      }

      const pwError = isValidPassword(new_password);
      if (pwError) return jsonRes({ error: pwError }, 400);

      const { data: otpRecord } = await supabase
        .from("otp_store")
        .select("*")
        .eq("id", reset_token)
        .eq("purpose", "reset")
        .maybeSingle();

      if (!otpRecord || otpRecord.is_used === false) {
        return jsonRes({ error: "Invalid or expired reset session." }, 401);
      }

      const ageMs = Date.now() - new Date(otpRecord.created_at).getTime();
      if (ageMs > 10 * 60 * 1000) {
        return jsonRes({ error: "Reset session has expired." }, 401);
      }

      const hash = await hashPassword(new_password);
      const { error: updateError } = await supabase
        .from("app_users")
        .update({ password_hash: hash, must_change_password: false, updated_at: new Date().toISOString() })
        .eq("email", otpRecord.email);

      if (updateError) return jsonRes({ error: "Failed to update password." }, 500);

      await logAudit("Password Reset", `Email: ${otpRecord.email}`, otpRecord.email);
      return jsonRes({ message: "Password reset successfully." });
    }

    // ---------- CHANGE PASSWORD ----------
    if (path === "change-password") {
      const { user_id, current_password, new_password } = body;
      if (!user_id || !current_password || !new_password) {
        return jsonRes({ error: "All fields are required." }, 400);
      }

      const pwError = isValidPassword(new_password);
      if (pwError) return jsonRes({ error: pwError }, 400);

      const { data: user } = await supabase
        .from("app_users")
        .select("*")
        .eq("id", user_id)
        .maybeSingle();

      if (!user) return jsonRes({ error: "User not found." }, 404);

      const currentHash = await hashPassword(current_password);
      if (currentHash !== user.password_hash) {
        await logAudit("Failed Password Change", `Wrong current password: ${user.email}`, user.email);
        return jsonRes({ error: "Current password is incorrect." }, 401);
      }

      const newHash = await hashPassword(new_password);
      const { error: updateError } = await supabase
        .from("app_users")
        .update({ password_hash: newHash, must_change_password: false, updated_at: new Date().toISOString() })
        .eq("id", user_id);

      if (updateError) return jsonRes({ error: "Failed to update password." }, 500);

      await logAudit("Password Changed", `User: ${user.username}`, user.username);
      return jsonRes({ message: "Password changed successfully." });
    }

    // ---------- GET USER ----------
    if (path === "get-user") {
      const { user_id } = body;
      if (!user_id) return jsonRes({ error: "User ID required." }, 400);

      const { data: user } = await supabase
        .from("app_users")
        .select("id, username, email, is_active, must_change_password, created_at, updated_at")
        .eq("id", user_id)
        .maybeSingle();

      if (!user) return jsonRes({ error: "User not found." }, 404);
      return jsonRes({ user });
    }

    // ---------- UPDATE USER ----------
    if (path === "update-user") {
      const { user_id, username, email, is_active } = body;
      if (!user_id) return jsonRes({ error: "User ID required." }, 400);

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (username !== undefined) updates.username = username;
      if (email !== undefined) updates.email = email?.toLowerCase().trim();
      if (is_active !== undefined) updates.is_active = is_active;

      const { data: updated, error } = await supabase
        .from("app_users")
        .update(updates)
        .eq("id", user_id)
        .select("id, username, email, is_active, must_change_password")
        .maybeSingle();

      if (error) {
        return jsonRes({ error: "Failed to update user. Email/username may already be in use." }, 400);
      }

      await logAudit(
        is_active === true ? "User Activated" : is_active === false ? "User Deactivated" : "User Updated",
        `User: ${updated?.username}`,
        updated?.username ?? "System",
      );

      return jsonRes({ user: updated });
    }

    // ---------- LOGOUT ----------
    if (path === "logout") {
      const { username } = body;
      if (username) await logAudit("Logout", `User: ${username}`, username);
      return jsonRes({ message: "Logged out." });
    }

    return jsonRes({ error: "Unknown endpoint." }, 404);
  } catch (err) {
    return jsonRes({ error: err instanceof Error ? err.message : "Internal server error." }, 500);
  }
});
