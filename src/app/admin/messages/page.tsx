import { Inbox } from "lucide-react";
import { db } from "@/server/db";
import { deleteMessageAction, setMessageHandledAction } from "@/app/actions/admin";
import { ActionButton } from "@/components/admin/admin-ui";
import { EmptyState } from "@/components/board/board-ui";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Messages" };

export default async function AdminMessages() {
  const messages = await db.contactMessage.findMany({ orderBy: [{ handled: "asc" }, { createdAt: "desc" }], take: 100 });
  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Messages</h1>
      {messages.length ? (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li key={m.id}>
              <Card className={`p-4 ${m.handled ? "opacity-70" : ""}`}>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <strong>{m.name}</strong>
                  <a href={`mailto:${m.email}`} className="text-brand-ink hover:underline">
                    {m.email}
                  </a>
                  <Badge>{m.topic}</Badge>
                  {!m.handled && <Badge tone="brand">New</Badge>}
                  <span className="ml-auto text-xs text-subtle">{m.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</span>
                </div>
                <p className="mt-2 text-sm whitespace-pre-wrap text-muted">{m.message}</p>
                <div className="mt-3 flex gap-2">
                  <ActionButton action={setMessageHandledAction.bind(null, m.id, !m.handled)}>{m.handled ? "Mark as new" : "Mark handled"}</ActionButton>
                  <ActionButton action={deleteMessageAction.bind(null, m.id)} variant="danger-ghost" confirm="Click again to delete">
                    Delete
                  </ActionButton>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Inbox} title="No messages">
          Messages sent from the contact page appear here.
        </EmptyState>
      )}
    </div>
  );
}
