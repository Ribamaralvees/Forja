"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function sair() {
    if (loading) return;
    setLoading(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button className="logout-btn" onClick={sair} disabled={loading} aria-label="Sair da conta">
      {loading ? <Loader2 size={16} className="spin" /> : <LogOut size={16} />}
      <span>Sair</span>
    </button>
  );
}
