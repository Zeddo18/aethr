"use client";

import { useState, type FormEvent } from "react";
import { Download, Trash2, ShieldCheck } from "lucide-react";
import { DELETE_CONFIRMATION } from "@/lib/account-security";

export function AccountPrivacySettings() {
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function downloadData() {
    if (downloading) return;
    setDownloading(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/account/export", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Couldn't export your data.");
      }
      const blob = await response.blob();
      const file = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = file;
      link.download = "aethr-data-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(file), 1_000);
      setNotice("Your private data file is ready. Keep it somewhere secure.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download your data.");
    } finally {
      setDownloading(false);
    }
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deleting || confirmation !== DELETE_CONFIRMATION || !password) return;
    setDeleting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.deleted !== true) {
        throw new Error(body.error || "Account deletion was not completed.");
      }
      setPassword("");
      window.location.assign("/login?account_deleted=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account deletion was not completed.");
      setPassword("");
      setDeleting(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-surface p-4" aria-label="Account privacy">
      <div>
        <div className="flex items-center gap-2 text-accent">
          <ShieldCheck size={20} aria-hidden />
          <span className="text-sm">Your information</span>
        </div>
        <h2 className="mt-2 font-display text-xl font-semibold">Account and privacy</h2>
        <p className="mt-2 text-sm text-muted">
          Your personal records belong to you. You can download a copy or request permanent account deletion.
        </p>
      </div>

      <div className="space-y-2">
        <button className="btn w-full" type="button" disabled={downloading || deleting} onClick={downloadData}>
          <Download size={18} aria-hidden /> {downloading ? "Preparing your file…" : "Download my data"}
        </button>
        <p className="text-xs text-muted">
          Downloads a private JSON file with your profile, meals, exercises, workouts, activity routes, saved foods,
          recipes, recovery entries and reminder settings. Provider logs and backups are not included.
        </p>
      </div>

      <div className="border-t border-line pt-4">
        {!showDelete ? (
          <button className="btn-ghost w-full justify-center" type="button"
            onClick={() => { setShowDelete(true); setError(""); setNotice(""); }}>
            <Trash2 size={18} aria-hidden /> Delete my account
          </button>
        ) : (
          <form onSubmit={deleteAccount} className="space-y-3">
            <h3 className="text-base font-semibold">Permanently delete your AETHR account</h3>
            <p className="text-sm text-muted">
              This removes your account and app records, including meal logs and workout/GPS history.
              You won't be able to restore them from this screen. Download your data first if you want a copy.
              Provider records and system backups may have separate retention periods.
            </p>
            <div>
              <label className="label" htmlFor="delete-confirmation">
                Type <strong>{DELETE_CONFIRMATION}</strong> to confirm
              </label>
              <input id="delete-confirmation" className="field" type="text" autoComplete="off"
                value={confirmation} onChange={e => setConfirmation(e.target.value)}
                required spellCheck={false} />
            </div>
            <div>
              <label className="label" htmlFor="delete-password">Current account password</label>
              <input id="delete-password" className="field" type="password"
                autoComplete="current-password" value={password}
                onChange={e => setPassword(e.target.value)} required />
              <p className="mt-1 text-xs text-muted">
                For your security, account deletion requires password verification. This feature must be
                configured by the app administrator before it can run.
              </p>
            </div>
            <button className="w-full rounded-xl bg-red-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
              type="submit" disabled={deleting || confirmation !== DELETE_CONFIRMATION || !password}>
              {deleting ? "Deleting your account…" : "Permanently delete account"}
            </button>
            <button className="btn-ghost w-full justify-center" type="button"
              disabled={deleting}
              onClick={() => { setShowDelete(false); setConfirmation(""); setPassword(""); setError(""); }}>
              Cancel
            </button>
          </form>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {notice && <p role="status" className="text-sm text-accent">{notice}</p>}
    </section>
  );
}
