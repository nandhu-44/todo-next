import { redirect } from "next/navigation";
import TodoApp from "@/components/TodoApp";
import { getUser, toPublic } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getUser();
  if (!user) redirect("/signin");
  return <TodoApp user={toPublic(user)} />;
}
