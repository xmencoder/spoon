"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminProvider, useAdmin } from "@/lib/admin/AdminContext";
import { createClient } from "@/lib/supabase/client";
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
  CalendarClock,
  Gift,
  UserPlus,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

// ─── Add New Admin Modal ──────────────────────────────────────────────────────
function AddAdminModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signUpError) throw signUpError;

      if (data.user && !data.session) {
        setSuccess(
          "Admin account created! They'll need to confirm their email before signing in."
        );
      } else {
        setSuccess("Admin account created successfully!");
      }
      setEmail("");
      setPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create admin";
      if (msg.toLowerCase().includes("rate limit")) {
        setError(
          "Email rate limit exceeded. In Supabase Dashboard → Auth → Providers → Email, turn off 'Confirm email', or create the user directly in Auth → Users."
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-spoon-border bg-white p-6 shadow-warm-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-spoon-sand text-spoon-caramel border border-spoon-border/60">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-spoon-dark">Add New Admin</p>
              <p className="text-[10px] text-spoon-muted">Create a new admin account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-spoon-muted hover:text-spoon-dark rounded-lg p-1 hover:bg-spoon-sand/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 leading-relaxed">
            <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 leading-relaxed">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-spoon-dark mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-spoon-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="newadmin@example.com"
                required
                className="w-full rounded-xl border border-spoon-border bg-spoon-cream/40 pl-9 pr-3.5 py-2.5 text-xs text-spoon-dark placeholder:text-spoon-muted focus:outline-none focus:ring-2 focus:ring-spoon-caramel/40 focus:border-spoon-caramel transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-spoon-dark mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-spoon-muted" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
                minLength={6}
                className="w-full rounded-xl border border-spoon-border bg-spoon-cream/40 pl-9 pr-3.5 py-2.5 text-xs text-spoon-dark placeholder:text-spoon-muted focus:outline-none focus:ring-2 focus:ring-spoon-caramel/40 focus:border-spoon-caramel transition-all"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-spoon-border px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-spoon-muted hover:bg-spoon-sand/40 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-spoon-caramel px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-spoon-caramel/90 transition-colors disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Create Admin</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Admin Layout Inner ───────────────────────────────────────────────────────
function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [addAdminOpen, setAddAdminOpen] = useState(false);
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
    { label: "Delivery Slots", href: "/admin/delivery", icon: CalendarClock },
    { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
    { label: "Bulk Enquiries", href: "/admin/bulk-orders", icon: Gift },
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

          {/* Sign Out */}
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors text-left"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>

          {/* Divider */}
          <div className="border-t border-spoon-border/40 pt-2">
            {/* Add New Admin */}
            <button
              onClick={() => setAddAdminOpen(true)}
              className="w-full flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-spoon-caramel hover:bg-spoon-sand/60 transition-colors text-left"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Add New Admin</span>
            </button>
          </div>
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

      {/* Add Admin Modal */}
      {addAdminOpen && <AddAdminModal onClose={() => setAddAdminOpen(false)} />}
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
