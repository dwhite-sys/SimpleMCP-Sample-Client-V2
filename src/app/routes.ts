import { createBrowserRouter } from "react-router";
import { ChatPage } from "./components/ChatPage";
import { SettingsPage } from "./components/SettingsPage";
import { Layout } from "./components/Layout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: ChatPage },
      { path: "settings", Component: SettingsPage },
    ],
  },
]);
