import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { createMemoryRouter, RouterProvider } from "react-router";

import { RootLayout } from "./layouts/root-layout";
import { HomeScreen } from "./screens/home";
import { NewSessionScreen } from "./screens/new-session";
import { SessionScreen } from "./screens/session";

const router = createMemoryRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomeScreen />,
      },
      {
        path: "sessions/new",
        element: <NewSessionScreen />,
      },
      {
        path: "sessions/:id",
        element: <SessionScreen />,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

const renderer = await createCliRenderer({
  targetFps: 60,
  exitOnCtrlC: false,
});
createRoot(renderer).render(<App />);
