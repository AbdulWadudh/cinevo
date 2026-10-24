import NavBar from "@/components/NavBar";
import { getNavViewer } from "@/lib/auth";

/**
 * Resolves the viewer on the server so the admin-only chrome is part of the
 * first paint. Deciding it on the client made the palette shortcut pop in a
 * beat after the rest of the nav had already settled.
 */
export default async function Nav() {
  return <NavBar initialViewer={await getNavViewer()} />;
}
