import { redirect } from "next/navigation";
import AppearanceSync from "@/components/AppearanceSync";
import TodoApp from "@/components/TodoApp";
import { getSessionUserId, toPublic } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { toTodo } from "@/lib/todoInput";

export const dynamic = "force-dynamic";

export default async function Home() {
  const id = await getSessionUserId();
  if (!id) redirect("/signin");
  // The session cookie already names the user, so the account and its todos load in parallel
  // (one round trip to the database instead of two), and the page arrives with its data: no second request.
  const db = await getDb();
  const [user, todos] = await Promise.all([db.users.findOne({ id }), db.todos.find({ userId: id })]);
  if (!user) redirect("/signin");
  const pub = toPublic(user);
  return (
    <>
      <AppearanceSync appearance={pub.appearance} />
      <TodoApp user={pub} initialTodos={todos.map(toTodo).sort((a, b) => a.order - b.order)} />
    </>
  );
}
