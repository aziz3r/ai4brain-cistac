"use client";

import React, { useState, useEffect } from "react";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { useLanguage } from "../../context/LanguageContext";

export default function PrivacyPage() {
  const { t } = useLanguage();
  const [userId, setUserId] = useState<string>("cistac_user_01");
  const [statusMessage, setStatusMessage] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem("ai4brain_user_id") || "cistac_user_01";
    setUserId(stored);
  }, []);

  const handleExport = async () => {
    try {
      const res = await fetch(`http://localhost:8000/user/${userId}/export`);
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ai4brain_export_${userId}.json`;
        a.click();
        setStatusMessage(t("privacy.export_success"));
      }
    } catch {
      setStatusMessage(t("privacy.export_error"));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t("privacy.confirm_delete"))) {
      return;
    }
    try {
      const res = await fetch(`http://localhost:8000/user/${userId}/data`, {
        method: "DELETE",
      });
      if (res.ok) {
        localStorage.removeItem("ai4brain_user_id");
        setStatusMessage(t("privacy.delete_success"));
      }
    } catch {
      setStatusMessage(t("privacy.delete_error"));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 sm:py-20 space-y-12">
        <div className="space-y-4">
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-ink">
            {t("privacy.title")}
          </h1>
          <p className="text-lg text-muted-ink leading-relaxed">
            {t("privacy.body")}
          </p>
        </div>

        <section className="hairline-t pt-8 space-y-6">
          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-bold text-ink">
              {t("privacy.retention_title")}
            </h2>
            <p className="text-sm text-muted-ink leading-relaxed">
              {t("privacy.retention_desc")}
            </p>
          </div>

          <div className="p-4 bg-teal/10 rounded-sm text-sm text-ink leading-relaxed">
            {t("privacy.active_id_label")} : <code className="font-mono text-xs">{userId}</code>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <button
              type="button"
              onClick={handleExport}
              className="w-full sm:w-auto px-6 py-3 bg-paper border border-ink text-ink font-medium rounded-sm hover:bg-ink hover:text-white transition-colors text-sm"
            >
              {t("privacy.export_btn")}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="w-full sm:w-auto px-6 py-3 border border-terracotta text-terracotta font-medium rounded-sm hover:bg-terracotta hover:text-white transition-colors text-sm"
            >
              {t("privacy.delete_btn")}
            </button>
          </div>

          {statusMessage && (
            <p className="text-sm text-teal font-medium pt-2">
              {statusMessage}
            </p>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
