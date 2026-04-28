import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    const { error } = await supabase
      .from("servers")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("DELETE ERROR:", error);
      return Response.json({ error: "Delete failed" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("API ERROR:", error);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}