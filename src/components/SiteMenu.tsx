"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import StaggeredMenu, { type StaggeredMenuItem } from "@/components/reactbits/StaggeredMenu";
import NotificationBell from "@/components/NotificationBell";
import "./SiteMenu.css";

const MENU_ITEMS: StaggeredMenuItem[] = [
  { label: "Home", ariaLabel: "Go to home", link: "/" },
  { label: "Browse", ariaLabel: "Browse all titles", link: "/browse" },
  { label: "Gallery", ariaLabel: "Open the 3D gallery", link: "/gallery" },
  { label: "Mystery", ariaLabel: "Reveal mystery picks", link: "/reveal" },
  { label: "Wishlist", ariaLabel: "Your wishlist", link: "/wishlist" },
  { label: "History", ariaLabel: "Your watch history", link: "/history" },
  { label: "Profile", ariaLabel: "Your profile", link: "/profile" },
];

/** Cinevo's primary navigation — the React Bits StaggeredMenu, themed, with
 *  search + notifications as round buttons pinned to the bottom of the panel. */
export default function SiteMenu() {
  const pathname = usePathname();
  const router = useRouter();

  const footer = (
    <div className="sm-footer-actions">
      <button
        type="button"
        aria-label="Search"
        className="sm-footer-btn"
        onClick={() => router.push("/search")}
      >
        <Search className="w-5 h-5" />
      </button>
      <div className="sm-footer-btn sm-footer-btn--bell">
        <NotificationBell align="up" centered />
      </div>
    </div>
  );

  return (
    <StaggeredMenu
      isFixed
      className="cinevo-menu"
      position="right"
      items={MENU_ITEMS}
      displaySocials={false}
      displayItemNumbering={false}
      currentPath={pathname}
      panelFooter={footer}
      logoUrl="/full_logo.png"
      menuButtonColor="#ffffff"
      openMenuButtonColor="#ffffff"
      changeMenuColorOnOpen
      accentColor="#e53e4f"
      colors={["#1a1430", "#e53e4f"]}
    />
  );
}
