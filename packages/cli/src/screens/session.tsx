import { useParams } from "react-router";
import { SessionShell } from "../components/session-shell";

export const SessionScreen = () => {
  const { id } = useParams();

  return (
    <SessionShell onSubmit={() => {}} inputDisabled loading>
      <text>Session {id}</text>
    </SessionShell>
  );
};
