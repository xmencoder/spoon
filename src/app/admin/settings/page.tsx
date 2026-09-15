"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useAdmin } from "@/lib/admin/AdminContext";
import { updateAdminRestaurantSettings } from "@/lib/admin/admin-service";
import { uploadProductImage, validateImageFile } from "@/lib/supabase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Store,
  Upload,
  X,
  Clock,
  Phone,
  MapPin,
  Truck,
  ShoppingBag,
} from "lucide-react";

export default function AdminSettingsPage() {
  const { restaurant, refreshRestaurant } = useAdmin();

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [deliveryCharge, setDeliveryCharge] = useState("40");
  const [minimumOrder, setMinimumOrder] = useState("200");
  const [isOpen, setIsOpen] = useState(true);
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [takeawayEnabled, setTakeawayEnabled] = useState(true);

  // Logo State
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // UI Status
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name || "");
      setDescription(restaurant.description || "");
      setWhatsappNumber(restaurant.whatsapp_number || "");
      setPhone(restaurant.phone || "");
      setAddress(restaurant.address || "");
      setOpeningHours(restaurant.opening_hours || "11:00 AM – 11:00 PM Daily");
      setDeliveryCharge(restaurant.delivery_charge?.toString() || "40");
      setMinimumOrder(restaurant.minimum_order?.toString() || "200");
      setIsOpen(restaurant.is_open ?? true);
      setDeliveryEnabled(restaurant.delivery_enabled ?? true);
      setTakeawayEnabled(restaurant.takeaway_enabled ?? true);
      setLogoUrl(restaurant.logo_url);
    }
  }, [restaurant]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMsg(validation.error || "Invalid logo image");
      return;
    }

    setErrorMsg(null);
    setLogoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);
  };

  const removeLogo = () => {
    setLogoFile(null);
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
      setLogoPreview(null);
    }
    setLogoUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant?.id) {
      setErrorMsg("Restaurant profile not found. Please refresh the page.");
      return;
    }

    if (!name.trim()) {
      setErrorMsg("Restaurant brand name is required.");
      return;
    }

    if (!whatsappNumber.trim()) {
      setErrorMsg("WhatsApp number is required for dispatch orders.");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);

      let finalLogoUrl = logoUrl;

      // If user uploaded a new logo file
      if (logoFile) {
        const uploadResult = await uploadProductImage(restaurant.id, logoFile);
        if (uploadResult.error) {
          throw new Error(`Failed to upload logo: ${uploadResult.error}`);
        }
        finalLogoUrl = uploadResult.url;
      }

      await updateAdminRestaurantSettings(restaurant.id, {
        name: name.trim(),
        description: description.trim() || null,
        whatsapp_number: whatsappNumber.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        opening_hours: openingHours.trim() || null,
        delivery_charge: parseFloat(deliveryCharge) || 0,
        minimum_order: parseFloat(minimumOrder) || 0,
        is_open: isOpen,
        delivery_enabled: deliveryEnabled,
        takeaway_enabled: takeawayEnabled,
        logo_url: finalLogoUrl,
      });

      await refreshRestaurant();
      setSuccessMsg("Restaurant settings updated successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      console.error("Save settings error:", err);
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to update settings"
      );
    } finally {
      setSaving(false);
    }
  };

  const activeLogo = logoPreview || logoUrl;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-spoon-border/60">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-spoon-dark">
          Restaurant Settings
        </h1>
        <p className="text-xs text-spoon-muted mt-0.5">
          Configure cloud kitchen identity, dispatch numbers, operating hours, and live fulfillment rules.
        </p>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-medium text-rose-900">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-medium text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Settings Form */}
      <div className="rounded-3xl border border-spoon-border bg-white p-6 sm:p-8 shadow-warm-sm">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Section 1: Brand & Logo */}
          <div className="space-y-4">
            <h2 className="font-serif font-bold text-base text-spoon-dark flex items-center gap-2">
              <Store className="h-4 w-4 text-spoon-caramel" />
              <span>Brand Identity & Visuals</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
              {/* Logo Preview & Upload */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-2">
                  Kitchen Logo
                </label>
                {activeLogo ? (
                  <div className="relative h-28 w-28 rounded-2xl border border-spoon-border bg-spoon-sand/40 overflow-hidden flex items-center justify-center">
                    <Image
                      src={activeLogo}
                      alt="Brand Logo"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-white hover:bg-black transition-colors"
                      title="Remove logo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-28 w-28 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-spoon-border bg-spoon-cream hover:bg-spoon-sand/50 transition-colors cursor-pointer text-center p-2">
                    <Upload className="h-5 w-5 text-spoon-muted mb-1" />
                    <span className="text-[10px] font-bold text-spoon-dark">Upload Logo</span>
                    <span className="text-[9px] text-spoon-muted">Max 5MB</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Brand Name & Description */}
              <div className="sm:col-span-2 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
                    Restaurant Brand Name *
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="The Indulgent Spoon"
                    required
                    className="text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
                    Brand Tagline / Kitchen Description
                  </label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Artisanal Cloud Kitchen & Confectionery"
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-spoon-border/60" />

          {/* Section 2: Contact & Location */}
          <div className="space-y-4">
            <h2 className="font-serif font-bold text-base text-spoon-dark flex items-center gap-2">
              <Phone className="h-4 w-4 text-spoon-caramel" />
              <span>Contact & Dispatch Coordinates</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
                  WhatsApp Dispatch Number *
                </label>
                <Input
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+919876543210"
                  required
                  className="text-xs"
                />
                <p className="text-[10px] text-spoon-muted mt-1">
                  Customer orders are formatted and routed directly to this WhatsApp number.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
                  Secondary Customer Support Phone
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 1274 250000"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-spoon-muted" />
                  <span>Kitchen Physical Address</span>
                </label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Sector 14, Rewari, Haryana 123401"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-spoon-muted" />
                  <span>Opening Hours / Service Timings</span>
                </label>
                <Input
                  value={openingHours}
                  onChange={(e) => setOpeningHours(e.target.value)}
                  placeholder="11:00 AM – 11:00 PM Daily"
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          <hr className="border-spoon-border/60" />

          {/* Section 3: Delivery Fees & Minimums */}
          <div className="space-y-4">
            <h2 className="font-serif font-bold text-base text-spoon-dark flex items-center gap-2">
              <Truck className="h-4 w-4 text-spoon-caramel" />
              <span>Ordering Rules & Pricing</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
                  Standard Delivery Fee (₹)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(e.target.value)}
                  placeholder="40"
                  className="text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
                  Minimum Order Amount (₹)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={minimumOrder}
                  onChange={(e) => setMinimumOrder(e.target.value)}
                  placeholder="200"
                  className="text-xs font-semibold"
                />
              </div>
            </div>
          </div>

          <hr className="border-spoon-border/60" />

          {/* Section 4: Live Store Status Toggles */}
          <div className="space-y-3">
            <h2 className="font-serif font-bold text-base text-spoon-dark">
              Live Operations & Channels
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <label
                className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
                  isOpen
                    ? "border-emerald-300 bg-emerald-50/40 text-emerald-950"
                    : "border-spoon-border bg-spoon-cream/50 text-spoon-muted"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isOpen}
                  onChange={(e) => setIsOpen(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-spoon-border text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="block font-serif font-bold text-xs">
                    Kitchen Open for Business
                  </span>
                  <span className="text-[11px] opacity-80 mt-0.5 block">
                    Accepting real-time customer orders
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
                  deliveryEnabled
                    ? "border-spoon-caramel/40 bg-spoon-sand/30 text-spoon-dark"
                    : "border-spoon-border bg-spoon-cream/50 text-spoon-muted"
                }`}
              >
                <input
                  type="checkbox"
                  checked={deliveryEnabled}
                  onChange={(e) => setDeliveryEnabled(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-spoon-border text-spoon-caramel focus:ring-spoon-caramel"
                />
                <div>
                  <span className="block font-serif font-bold text-xs flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-spoon-caramel" />
                    <span>Home Delivery</span>
                  </span>
                  <span className="text-[11px] opacity-80 mt-0.5 block">
                    Allow doorstep delivery orders
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
                  takeawayEnabled
                    ? "border-spoon-caramel/40 bg-spoon-sand/30 text-spoon-dark"
                    : "border-spoon-border bg-spoon-cream/50 text-spoon-muted"
                }`}
              >
                <input
                  type="checkbox"
                  checked={takeawayEnabled}
                  onChange={(e) => setTakeawayEnabled(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-spoon-border text-spoon-caramel focus:ring-spoon-caramel"
                />
                <div>
                  <span className="block font-serif font-bold text-xs flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5 text-spoon-caramel" />
                    <span>Kitchen Takeaway</span>
                  </span>
                  <span className="text-[11px] opacity-80 mt-0.5 block">
                    Allow self-pickup orders
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-spoon-border/60">
            <Button
              type="submit"
              disabled={saving}
              className="gap-2 font-bold uppercase tracking-wider text-xs px-6 py-2.5 shadow-warm-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Restaurant Settings</span>
                </>
              )}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
