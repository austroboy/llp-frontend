"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLanguage } from "@/hooks/use-language";
import type { LucideIcon } from "lucide-react";
import "./mobile-bottom-nav.css";

export interface MobileNavItem {
  href: string;
  icon: LucideIcon;
  labelKey: string;
  exact?: boolean;
}

interface MobileBottomNavProps {
  items: MobileNavItem[];
  moreItems?: MobileNavItem[];
}

const TILE_TARGET_PX = 72;

export function MobileBottomNav({ items, moreItems = [] }: MobileBottomNavProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();

  const allItems = useMemo(() => [...items, ...moreItems], [items, moreItems]);

  const navRef = useRef<HTMLElement | null>(null);
  const [primaryCount, setPrimaryCount] = useState<number>(items.length);

  useEffect(() => {
    const node = navRef.current;
    if (!node) return;
    const compute = () => {
      const width = node.clientWidth;
      const fits = Math.max(1, Math.floor(width / TILE_TARGET_PX));
      const total = allItems.length;
      if (fits >= total) {
        setPrimaryCount(total);
      } else {
        setPrimaryCount(Math.max(1, fits - 1));
      }
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(node);
    return () => ro.disconnect();
  }, [allItems.length]);

  const visiblePrimary = allItems.slice(0, primaryCount);
  const overflow = allItems.slice(primaryCount);
  const showMore = overflow.length > 0;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const moreActive = overflow.some((it) => isActive(it.href, it.exact));

  return (
    <nav
      ref={navRef}
      className="lf-bottom-nav lg:hidden"
      aria-label="Primary navigation"
    >
      <div className="lf-bottom-nav-row">
        {visiblePrimary.map(({ href, icon: Icon, labelKey, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className="lf-bottom-nav-item"
              data-active={active ? "true" : "false"}
              aria-current={active ? "page" : undefined}
            >
              <span className="lf-bottom-nav-item-dot" aria-hidden />
              <Icon className="lf-bottom-nav-icon" strokeWidth={active ? 2.4 : 1.8} />
              <span className="lf-bottom-nav-label">{t(labelKey)}</span>
            </Link>
          );
        })}

        {showMore && (
          <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="lf-bottom-nav-item"
                data-active={moreActive ? "true" : "false"}
                aria-label={t("admin.nav.more")}
              >
                <span className="lf-bottom-nav-item-dot" aria-hidden />
                <Menu className="lf-bottom-nav-icon" strokeWidth={moreActive ? 2.4 : 1.8} />
                <span className="lf-bottom-nav-label">{t("admin.nav.more")}</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="lf-bottom-more-sheet">
              <SheetHeader>
                <SheetTitle className="lf-bottom-more-title">
                  {t("admin.nav.more")}
                </SheetTitle>
              </SheetHeader>
              <div className="lf-bottom-more-grid">
                {overflow.map(({ href, icon: Icon, labelKey, exact }) => {
                  const active = isActive(href, exact);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setIsMoreOpen(false)}
                      className="lf-bottom-more-tile"
                      data-active={active ? "true" : "false"}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="lf-bottom-more-tile-icon" strokeWidth={active ? 2.4 : 1.8} />
                      <span className="lf-bottom-more-tile-label">{t(labelKey)}</span>
                    </Link>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  );
}
