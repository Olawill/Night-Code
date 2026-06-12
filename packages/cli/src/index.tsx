import { ConsolePosition, createCliRenderer } from "@opentui/core";
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
  consoleOptions: {
    position: ConsolePosition.RIGHT, // Position on screen
    sizePercent: 30, // Size as percentage of terminal
    colorInfo: "#00FFFF", // Color for console.info
    colorWarn: "#FFFF00", // Color for console.warn
    colorError: "#FF0000", // Color for console.error
    startInDebugMode: false, // Show file/line info in logs
  },
  onDestroy: () => process.exit(0),
});

createRoot(renderer).render(<App />);
