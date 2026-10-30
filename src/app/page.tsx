import { redirect } from "next/navigation";
import AppearanceSync from "@/components/AppearanceSync";
import TodoApp from "@/components/TodoApp";
import { getUser, toPublic } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getUser();
  if (!user) redirect("/signin");
  const pub = toPublic(user);
  return (
    <>
      <AppearanceSync appearance={pub.appearance} />
      <TodoApp user={pub} />
    </>
  );
}
