"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAdmin } from "@/lib/admin/AdminContext";
import {
  getDashboardMetrics,
  updateAdminRestaurantSettings,
  type DashboardMetrics,
} from "@/lib/admin/admin-service";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Plus,
  ShoppingBag,
  Utensils,
  IndianRupee,
  Store,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Power,
  RefreshCw,
  CalendarClock,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { restaurant, loading: restLoading, refreshRestaurant } = useAdmin();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const loadMetrics = async (restId: string) => {
    try {
      setMetricsLoading(true);
      const data = await getDashboardMetrics(restId);
      setMetrics(data);
    } catch (err) {
      console.error("Failed to load dashboard metrics:", err);
    } finally {
      setMetricsLoading(false);
    }
  };

  useEffect(() => {
    if (restaurant?.id) {
      loadMetrics(restaurant.id);
    }
  }, [restaurant?.id]);

  const handleToggleStoreStatus = async () => {
    if (!restaurant?.id || !metrics) return;
    try {
      setTogglingStatus(true);
      const newStatus = !metrics.isOpen;
      await updateAdminRestaurantSettings(restaurant.id, {
        is_open: newStatus,
      });
      setMetrics((prev) => (prev ? { ...prev, isOpen: newStatus } : null));
      await refreshRestaurant();
    } catch (err) {
      console.error("Failed to toggle store status:", err);
    } finally {
      setTogglingStatus(false);
    }
  };

  if (restLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-spoon-caramel" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-spoon-border/60">
        <div>
          <h1 className="font-serif text-3xl font-bold text-spoon-dark">
            Kitchen Overview Dashboard
          </h1>
          <p className="text-xs text-spoon-muted mt-1">
            Real-time analytics and management for{" "}
            <span className="font-semibold text-spoon-dark">
              {restaurant?.name || "The Indulgent Spoon"}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => restaurant?.id && loadMetrics(restaurant.id)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-spoon-border bg-white text-spoon-dark hover:bg-spoon-sand transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw
              className={`h-4 w-4 ${metricsLoading ? "animate-spin" : ""}`}
            />
          </button>
          <Link href="/admin/products/new">
            <Button size="sm" className="gap-1.5 font-bold text-xs uppercase tracking-wider">
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </Button>
          </Link>
          <Link href="/admin/categories">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 font-bold text-xs uppercase tracking-wider"
            >
              <Plus className="h-4 w-4" />
              <span>Add Category</span>
            </Button>
          </Link>
          <Link href="/admin/delivery">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 font-bold text-xs uppercase tracking-wider text-spoon-caramel border-spoon-caramel/40 hover:bg-spoon-caramel/10"
            >
              <CalendarClock className="h-4 w-4" />
              <span>Delivery Slots</span>
            </Button>
          </Link>
          <Link href="/" target="_blank">
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 font-bold text-xs uppercase tracking-wider"
            >
              <ExternalLink className="h-4 w-4" />
              <span>View Store</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Today's Orders */}
        <Card className="rounded-2xl border-spoon-border/80 shadow-warm-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-spoon-muted font-sans">
              Today&apos;s Orders
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-spoon-sand text-spoon-caramel">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-serif font-bold text-spoon-dark">
              {metricsLoading ? "—" : metrics?.todaysOrdersCount ?? 0}
            </div>
            <p className="text-[11px] text-spoon-muted mt-1 font-medium">
              Orders placed today
            </p>
          </CardContent>
        </Card>

        {/* Today's Sales */}
        <Card className="rounded-2xl border-spoon-border/80 shadow-warm-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-spoon-muted font-sans">
              Today&apos;s Sales
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <IndianRupee className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-serif font-bold text-spoon-dark">
              {metricsLoading
                ? "—"
                : formatPrice(metrics?.todaysSalesTotal ?? 0)}
            </div>
            <p className="text-[11px] text-spoon-muted mt-1 font-medium">
              Gross sales revenue today
            </p>
          </CardContent>
        </Card>

        {/* Products Count */}
        <Card className="rounded-2xl border-spoon-border/80 shadow-warm-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-spoon-muted font-sans">
              Total Products
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-spoon-sand text-spoon-caramel">
              <Utensils className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-serif font-bold text-spoon-dark">
              {metricsLoading ? "—" : metrics?.totalProductsCount ?? 0}
            </div>
            <p className="text-[11px] text-spoon-muted mt-1 font-medium">
              <span className="text-emerald-700 font-bold">
                {metrics?.availableProductsCount ?? 0} available
              </span>{" "}
              for ordering
            </p>
          </CardContent>
        </Card>

        {/* Store Status Toggle */}
        <Card className="rounded-2xl border-spoon-border/80 shadow-warm-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-spoon-muted font-sans">
              Store Status
            </CardTitle>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                metrics?.isOpen
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              <Store className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="flex items-center justify-between">
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                  metrics?.isOpen
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    metrics?.isOpen
                      ? "bg-emerald-600 animate-pulse"
                      : "bg-rose-600"
                  }`}
                />
                <span>{metrics?.isOpen ? "Accepting Orders" : "Kitchen Paused"}</span>
              </div>

              <button
                onClick={handleToggleStoreStatus}
                disabled={togglingStatus}
                className="p-1.5 rounded-lg border border-spoon-border hover:bg-spoon-sand text-spoon-muted hover:text-spoon-dark transition-colors"
                title="Toggle Store Open/Closed"
              >
                {togglingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-spoon-muted mt-2 font-medium">
              WhatsApp ordering is {metrics?.isOpen ? "active" : "temporarily disabled"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Launch & Status Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 rounded-3xl border-spoon-border bg-white p-6 sm:p-8 shadow-warm-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-spoon-caramel bg-spoon-sand/60 px-3 py-1 rounded-full border border-spoon-border/80">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Backend Connected Live</span>
              </span>
              <h3 className="font-serif text-2xl font-bold text-spoon-dark">
                Welcome back to your restaurant console
              </h3>
              <p className="text-xs sm:text-sm text-spoon-muted leading-relaxed max-w-xl">
                Manage your dishes, adjust delivery fee and minimum order settings,
                and update pricing in real time. Any changes you save here instantly
                reflect on the public menu and in the customer checkout cart.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 mt-6 border-t border-spoon-border/60">
            <Link
              href="/admin/products"
              className="flex flex-col p-4 rounded-2xl bg-spoon-cream hover:bg-spoon-sand/60 border border-spoon-border/80 transition-all group"
            >
              <span className="text-xs font-bold text-spoon-dark group-hover:text-spoon-caramel">
                Manage Products →
              </span>
              <span className="text-[11px] text-spoon-muted mt-1">
                Edit prices, availability & photos
              </span>
            </Link>

            <Link
              href="/admin/categories"
              className="flex flex-col p-4 rounded-2xl bg-spoon-cream hover:bg-spoon-sand/60 border border-spoon-border/80 transition-all group"
            >
              <span className="text-xs font-bold text-spoon-dark group-hover:text-spoon-caramel">
                Manage Categories →
              </span>
              <span className="text-[11px] text-spoon-muted mt-1">
                Organize menu tabs & display order
              </span>
            </Link>

            <Link
              href="/admin/settings"
              className="flex flex-col p-4 rounded-2xl bg-spoon-cream hover:bg-spoon-sand/60 border border-spoon-border/80 transition-all group"
            >
              <span className="text-xs font-bold text-spoon-dark group-hover:text-spoon-caramel">
                Kitchen Settings →
              </span>
              <span className="text-[11px] text-spoon-muted mt-1">
                Configure WhatsApp number & fees
              </span>
            </Link>
          </div>
        </Card>

        {/* Restaurant Summary Card */}
        <Card className="rounded-3xl border-spoon-border bg-[#FFFDF9] p-6 shadow-warm-sm flex flex-col justify-between">
          <div>
            <h4 className="font-serif text-lg font-bold text-spoon-dark mb-4">
              Restaurant Details
            </h4>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-spoon-muted block">
                  Store Slug
                </span>
                <span className="font-mono text-spoon-dark font-medium">
                  {restaurant?.slug || "the-indulgent-spoon"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-spoon-muted block">
                  WhatsApp Dispatch
                </span>
                <span className="text-spoon-dark font-semibold">
                  {restaurant?.whatsapp_number || "+91 98765 43210"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-spoon-muted block">
                  Delivery Charge
                </span>
                <span className="text-spoon-dark font-semibold">
                  ₹{restaurant?.delivery_charge ?? 40}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-spoon-muted block">
                  Operating Hours
                </span>
                <span className="text-spoon-dark font-medium">
                  {restaurant?.opening_hours || "11:00 AM – 11:00 PM Daily"}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-spoon-border/60">
            <Link href="/admin/settings">
              <Button variant="outline" size="sm" className="w-full text-xs font-bold">
                Edit All Restaurant Settings
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
