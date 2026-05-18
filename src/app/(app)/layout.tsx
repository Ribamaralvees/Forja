import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import BottomNav from "@/components/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.name) redirect("/onboarding");

  return (
    <>
      <div className="wrap">
        <div className="scr">{children}</div>
      </div>
      <BottomNav />
    </>
  );
}
