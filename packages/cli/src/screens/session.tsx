import { useLocation, useNavigate, useParams } from "react-router";

import type { InferResponseType } from "hono/client";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { BotMessage, ErrorMessage, UserMessage } from "../components/messages";
import { SessionShell } from "../components/session-shell";
import { apiClient } from "../lib/api-client";
import { getErrorMessage } from "../lib/http-errors";
import { useToast } from "../providers/toast";

type SessionData = InferResponseType<
  (typeof apiClient.sessions)[":id"]["$get"],
  200
>;

const sessionLocationSchema = z.object({
  session: z.custom<SessionData>(
    (val) => val != null && typeof val === "object" && "id" in val,
  ),
});

type ChatMessageProps = {
  msg: SessionData["messages"][number];
};

const ChatMessage = ({ msg }: ChatMessageProps) => {
  if (msg.role === "USER") {
    return <UserMessage message={msg.content} />;
  }

  if (msg.role === "ERROR") {
    return <ErrorMessage message={msg.content} />;
  }

  return <BotMessage content={msg.content} model={msg.model} />;
};

export const SessionScreen = () => {
  const { id } = useParams();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const prefetched = useMemo(() => {
    const parsed = sessionLocationSchema.safeParse(location.state);
    return parsed.success ? parsed.data.session : null;
  }, [location.state]);

  const [session, setSession] = useState<SessionData | null>(prefetched);

  useEffect(() => {
    // Skip fetch if session was passed via location state
    if (prefetched) return;

    setSession(null);

    if (!id) return;

    let ignore = false;

    const fetchSession = async () => {
      try {
        const res = await apiClient.sessions[":id"].$get({
          param: { id },
        });

        if (ignore) return;

        if (!res.ok) {
          throw new Error(await getErrorMessage(res));
        }

        const resolvedSession = await res.json();

        setSession(resolvedSession);
      } catch (error) {
        if (ignore) return;

        toast.show({
          variant: "error",
          message:
            error instanceof Error ? error.message : "Failed to load session",
        });
        navigate("/", { replace: true });
      }
    };

    fetchSession();

    return () => {
      ignore = true;
    };
  }, [id, prefetched, toast, navigate]);

  if (!session) {
    return <SessionShell onSubmit={() => {}} inputDisabled loading />;
  }

  return (
    <SessionShell onSubmit={() => {}} inputDisabled>
      {session.messages.map((msg) => (
        <ChatMessage key={msg.id} msg={msg} />
      ))}
    </SessionShell>
  );
};
