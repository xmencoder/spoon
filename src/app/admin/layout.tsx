"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminProvider, useAdmin } from "@/lib/admin/AdminContext";
import {
  LayoutDashboard,
  Utensils,
  FolderTree,
  ShoppingBag,
  Settings,
  LogOut,
  ExternalLink,
  Store,
  Menu,
  X,
  Loader2,
} from "lucide-react";

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const { restaurant, loading, refreshRestaurant, signOut } = useAdmin();

  const isLoginPage = pathname === "/admin/login";
  if (isLoginPage) {
    return <>{children}</>;
  }

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Products", href: "/admin/products", icon: Utensils },
    { label: "Categories", href: "/admin/categories", icon: FolderTree },
    { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-spoon-cream/50 text-spoon-dark flex-col md:flex-row">
      {/* Mobile Header with Hamburger */}
      <div className="flex h-16 md:hidden items-center justify-between px-4 border-b border-spoon-border bg-white sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-spoon-sand text-spoon-caramel">
            <Store className="h-4 w-4" />
          </div>
          <div>
            <span className="font-serif text-sm font-bold text-spoon-dark block leading-tight">
              {restaurant?.name || "The Indulgent Spoon"}
            </span>
            <span className="text-[9px] text-spoon-muted uppercase tracking-wider block">
              Admin Portal
            </span>
          </div>
        </div>

        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="p-2 rounded-lg text-spoon-dark hover:bg-spoon-sand transition-colors"
          aria-label="Toggle mobile navigation"
        >
          {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar (Desktop permanent + Mobile slide-out) */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 border-r border-spoon-border bg-white flex flex-col shrink-0 z-50 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between px-6 border-b border-spoon-border/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-spoon-sand text-spoon-caramel border border-spoon-border/70 shadow-2xs">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <span className="font-serif text-base font-bold text-spoon-dark block leading-tight">
                {restaurant?.name || "The Indulgent Spoon"}
              </span>
              <span className="text-[10px] text-spoon-muted uppercase tracking-wider block">
                Admin Console
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="md:hidden text-spoon-muted hover:text-spoon-dark"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 p-4 text-xs font-semibold uppercase tracking-wider overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all ${
                  isActive
                    ? "bg-spoon-caramel text-white shadow-warm-sm"
                    : "text-spoon-dark hover:bg-spoon-sand/60"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? "text-white" : "text-spoon-caramel"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="border-t border-spoon-border/60 p-4 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between rounded-xl px-3.5 py-2 text-xs font-semibold text-spoon-muted hover:bg-spoon-sand/40 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              <span>View Public Store</span>
            </span>
          </Link>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors text-left"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Content Viewport */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex items-center gap-3 text-xs font-semibold text-spoon-muted uppercase tracking-wider">
              <Loader2 className="h-5 w-5 animate-spin text-spoon-caramel" />
              <span>Connecting to Supabase...</span>
            </div>
          </div>
        ) : (
          <>
            {!restaurant && (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-bold text-amber-950 text-sm">
                      ⚠️ Supabase Database Setup Required
                    </p>
                    <p className="leading-relaxed">
                      Database tables (<code>restaurants</code>, <code>categories</code>, <code>products</code>) were not found in your Supabase project. Paste and run <code>supabase/migrations/20240908000001_initial_schema.sql</code> in your Supabase SQL Editor.
                    </p>
                  </div>
                  <button
                    onClick={() => refreshRestaurant()}
                    className="self-start sm:self-center shrink-0 rounded-xl bg-spoon-caramel text-white px-4 py-2 font-bold hover:bg-spoon-caramel-dark transition-colors"
                  >
                    Check Again
                  </button>
                </div>
              </div>
            )}
            {children}
          </>
        )}
      </main>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminProvider>
  );
}
