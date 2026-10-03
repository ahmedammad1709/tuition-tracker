import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tuition Fee Tracker" },
      { name: "description", content: "Private fee tracker for a home tutor — see who paid each month." },
      { property: "og:title", content: "Tuition Fee Tracker" },
      { property: "og:description", content: "Private fee tracker for a home tutor — see who paid each month." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
