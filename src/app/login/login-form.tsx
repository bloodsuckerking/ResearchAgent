"use client";

import { useState } from "react";
import { KeyRound, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { loginAdmin } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await loginAdmin(email, password);
      router.replace("/");
      router.refresh();
    } catch (loginError) {
      const code = loginError instanceof Error ? loginError.message : "login_failed";
      setError(
        code === "invalid_credentials"
          ? t("auth.invalidCredentials")
          : code === "rate_limited"
            ? t("auth.rateLimited")
            : code === "setup_required"
              ? t("auth.setupRequired")
              : t("auth.failed"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" data-el="login-card">
        <div className="login-brand">
          <span className="login-mark" aria-hidden="true" />
          <div>
            <strong>{t("research.brand")}</strong>
            <small>{t("auth.eyebrow")}</small>
          </div>
        </div>

        <div className="login-heading">
          <ShieldCheck aria-hidden="true" />
          <div>
            <h1>{t("auth.title")}</h1>
            <p>{t("auth.description")}</p>
          </div>
        </div>

        <form onSubmit={submit} className="login-form">
          <div className="login-field">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <div className="login-input">
              <Mail aria-hidden="true" />
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={busy}
                data-el="login-email"
              />
            </div>
          </div>

          <div className="login-field">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <div className="login-input">
              <KeyRound aria-hidden="true" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={busy}
                data-el="login-password"
              />
            </div>
          </div>

          {error ? (
            <p className="login-error" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={busy || !email || !password}
            data-el="login-submit"
          >
            {busy ? <LoaderCircle className="animate-spin" /> : null}
            {busy ? t("auth.signingIn") : t("auth.signIn")}
          </Button>
        </form>

        <p className="login-footnote">{t("auth.selfHosted")}</p>
      </section>
    </main>
  );
}
