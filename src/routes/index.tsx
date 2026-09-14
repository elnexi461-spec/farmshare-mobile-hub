import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => { throw redirect({ to: "/auth" }); },
  head: () => ({ meta: [{ title: "Mifugo Farm Estate" }, { name: "description", content: "Manage your farm estate, animal packages and M-Pesa wallet." }, { property: "og:title", content: "Mifugo Farm Estate" }, { property: "og:description", content: "A premium digital farm estate experience." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Index,
});

function Index() {
  return null;
}
