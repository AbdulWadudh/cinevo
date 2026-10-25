"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import StaggeredMenu, { type StaggeredMenuItem } from "@/components/reactbits/StaggeredMenu";
import NotificationBell from "@/components/NotificationBell";
import ExperienceBrand from "@/components/theme/ExperienceBrand";
import { getExperience } from "@/lib/theme/experiences";
import { useTheme } from "@/lib/theme/studio/provider";
import "./SiteMenu.css";

/** Cinevo's primary navigation — the React Bits StaggeredMenu, themed, with
 *  search + notifications as round buttons pinned to the bottom of the panel. */
export default function SiteMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const { experience } = useTheme();
  const menuItems: StaggeredMenuItem[] = [
    ...getExperience(experience).nav.map((link) => ({
      label: link.label,
      ariaLabel: link.label,
      link: link.href,
    })),
    { label: "Profile", ariaLabel: "Your profile", link: "/profile" },
  ];

  // Search + notifications live in the top bar (outside the menu), like desktop.
  const headerExtras = (
    <>
      <button
        type="button"
        aria-label="Search"
        className="sm-hdr-btn"
        onClick={() => router.push("/search")}
      >
        <Search className="w-5 h-5" />
      </button>
      <NotificationBell />
    </>
  );

  return (
    <StaggeredMenu
      isFixed
      className="cinevo-menu"
      position="right"
      items={menuItems}
      displaySocials={false}
      displayItemNumbering={false}
      currentPath={pathname}
      headerExtras={headerExtras}
      logoUrl="/full_logo.png"
      logo={<ExperienceBrand className="xp-mobile-brand" />}
      logoHref="/"
      menuButtonColor="var(--color-fg)"
      openMenuButtonColor="var(--color-fg)"
      changeMenuColorOnOpen
      accentColor="var(--color-accent)"
      colors={["var(--color-surface)", "var(--color-accent)"]}
    />
  );
}
