"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCart } from "@/lib/store/CartContext";
import { createOrder } from "../actions";
import { formatPrice } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
import type { Restaurant } from "@/types/database";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Truck,
  ShoppingBag,
  User,
  Phone,
  MapPin,
  Utensils,
  CheckCircle2,
  Mail,
  Home,
  Building2,
  Navigation,
  Plus,
  X,
  Search,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AddressSuggestion {
  title: string;
  subtitle: string;
  city: string;
  postcode: string;
}

export default function CheckoutPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const {
    items,
    totalItems,
    subtotal,
    deliveryFee: defaultDeliveryFee,
    packagingFee,
    giftNoteFee,
    hasGiftNote,
    giftNote,
    clearCart,
  } = useCart();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);

  // Fulfilment
  const [orderType, setOrderType] = useState<"delivery" | "takeaway">("delivery");

  // Receiver's Contact
  const [salutation, setSalutation] = useState<"Mr" | "Ms" | "Mrs">("Mr");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [showAlternatePhone, setShowAlternatePhone] = useState(false);
  const [alternatePhone, setAlternatePhone] = useState("");

  // Receiver's Address (Granular fields as requested)
  const [flatBuilding, setFlatBuilding] = useState("");
  const [areaStreet, setAreaStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("122001");
  const [city, setCity] = useState("Gurugram");
  const [addressType, setAddressType] = useState<"home" | "office" | "other">("home");

  // Autocomplete Suggestions State
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Delivery Distance Calculation State
  const [isCheckingDelivery, setIsCheckingDelivery] = useState(false);
  const [isDeliveryChecked, setIsDeliveryChecked] = useState(false);
  const [isDeliveryAvailable, setIsDeliveryAvailable] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [deliveryCharge, setDeliveryCharge] = useState<number | null>(null);
  const [deliveryCheckError, setDeliveryCheckError] = useState<string | null>(null);
  const [verifiedFullAddress, setVerifiedFullAddress] = useState("");

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load restaurant details
  useEffect(() => {
    async function fetchRestaurant() {
      const supabase = createClient();
      const { data } = await supabase
        .from("restaurants")
        .select("*")
        .eq("slug", slug)
        .single();
      setRestaurant(data as Restaurant | null);
      setLoadingRestaurant(false);
    }
    fetchRestaurant();
  }, [slug]);

  // Click outside to dismiss address suggestions dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch live address auto-suggestions when typing in Area / Street
  useEffect(() => {
    const query = areaStreet.trim();
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingSuggestions(true);
        const res = await fetch(
          `/api/address-suggestions?q=${encodeURIComponent(query)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          if (data.suggestions && data.suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }
      } catch {
        // ignore suggestion fetch errors
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [areaStreet]);

  // Combined full address string for distance calculation & order
  const getFullAddress = () => {
    return [
      flatBuilding.trim(),
      areaStreet.trim(),
      landmark.trim() ? `Near ${landmark.trim()}` : null,
      city.trim(),
      pincode.trim(),
    ]
      .filter(Boolean)
      .join(", ");
  };

  // Invalidate previous verification whenever any address field changes
  const handleAddressFieldChange = () => {
    if (isDeliveryChecked) {
      setIsDeliveryChecked(false);
      setIsDeliveryAvailable(false);
      setDeliveryCharge(null);
      setDistanceKm(null);
      setDeliveryCheckError('Address modified. Please click "Check Delivery" again.');
    }
  };

  // Select an address suggestion from dropdown
  const handleSelectSuggestion = (item: AddressSuggestion) => {
    setAreaStreet(item.title);
    if (item.postcode) setPincode(item.postcode);
    if (item.city) setCity(item.city);
    setShowSuggestions(false);
    handleAddressFieldChange();
  };

  // Handle Delivery Availability Check
  const handleCheckDelivery = async () => {
    const fullAddr = getFullAddress();
    if (!flatBuilding.trim()) {
      setDeliveryCheckError("Please enter your Apartment / Flat / House / Building details.");
      return;
    }
    if (!areaStreet.trim()) {
      setDeliveryCheckError("Please enter your Area, Street, or Sector.");
      return;
    }
    if (!pincode.trim() || pincode.trim().length < 5) {
      setDeliveryCheckError("Please enter a valid Pincode.");
      return;
    }

    setIsCheckingDelivery(true);
    setDeliveryCheckError(null);

    try {
      const res = await fetch("/api/delivery-distance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: fullAddr }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setIsDeliveryChecked(true);
        setIsDeliveryAvailable(false);
        setDistanceKm(data?.distanceKm ?? null);
        setDeliveryCharge(null);
        setDeliveryCheckError(
          data?.error || "We couldn't find this address. Please check and try again."
        );
      } else if (!data.available) {
        setIsDeliveryChecked(true);
        setIsDeliveryAvailable(false);
        setDistanceKm(data.distanceKm);
        setDeliveryCharge(null);
        setDeliveryCheckError(
          data.error || "Sorry, we currently deliver only within 15 km."
        );
      } else {
        setIsDeliveryChecked(true);
        setIsDeliveryAvailable(true);
        setDistanceKm(data.distanceKm);
        setDeliveryCharge(data.deliveryCharge);
        setVerifiedFullAddress(fullAddr);
        setDeliveryCheckError(null);
      }
    } catch {
      setIsDeliveryChecked(false);
      setIsDeliveryAvailable(false);
      setDeliveryCharge(null);
      setDistanceKm(null);
      setDeliveryCheckError("Unable to check delivery right now. Please try again.");
    } finally {
      setIsCheckingDelivery(false);
    }
  };

  const effectiveDeliveryCharge =
    orderType === "delivery" && isDeliveryAvailable && deliveryCharge !== null
      ? deliveryCharge
      : 0;

  const currentGiftFee = hasGiftNote ? giftNoteFee : 0;
  const total = subtotal + effectiveDeliveryCharge + packagingFee + currentGiftFee;
  const minimumOrder = restaurant?.minimum_order ?? 0;

  // Validation
  const isBelowMinimum = minimumOrder > 0 && subtotal < minimumOrder;
  const isClosed = restaurant && !restaurant.is_open;
  const isContactValid = name.trim().length >= 2 && phone.trim().replace(/\D/g, "").length >= 10;
  const isAddressValid =
    orderType === "takeaway" ||
    (flatBuilding.trim().length >= 2 &&
      areaStreet.trim().length >= 2 &&
      pincode.trim().length >= 5 &&
      isDeliveryChecked &&
      isDeliveryAvailable);

  const canCheckout = !isClosed && !isBelowMinimum && totalItems > 0 && isContactValid && isAddressValid;

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !canCheckout) return;

    setSubmitting(true);
    setErrorMsg(null);

    const fullAddr = getFullAddress();
    const formattedCustomerName = `${salutation} ${name.trim()}`;

    try {
      const result = await createOrder({
        orderType,
        customerName: formattedCustomerName,
        customerPhone: phone.trim(),
        customerEmail: email.trim() || undefined,
        alternatePhone: alternatePhone.trim() || undefined,
        deliveryAddress: orderType === "delivery" ? fullAddr : "",
        addressType: orderType === "delivery" ? addressType : undefined,
        cartItems: items.map((i) => ({
          productId: i.product.id,
          productName: i.product.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          sizeLabel: i.sizeLabel,
          addons: i.addons,
        })),
        restaurantId: restaurant.id,
        restaurantSlug: slug,
        whatsappNumber: restaurant.whatsapp_number,
        deliveryCharge: effectiveDeliveryCharge,
        packagingCharge: packagingFee,
        hasGiftNote,
        giftNote,
      });

      if (!result.success || !result.whatsappUrl) {
        setErrorMsg(result.error || "Failed to place order. Please try again.");
        setSubmitting(false);
        return;
      }

      // Clear cart and redirect to order confirmation
      clearCart();

      if (result.orderId) {
        sessionStorage.setItem(`order-${slug}`, result.orderId);
      }

      window.open(result.whatsappUrl, "_blank");
      router.push(`/store/${slug}/order-success`);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (loadingRestaurant) {
    return (
      <div className="min-h-screen bg-[#D9BC9E] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#C26B59]" />
      </div>
    );
  }

  if (totalItems === 0) {
    return (
      <div className="min-h-screen bg-[#D9BC9E] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <ShoppingBag className="h-12 w-12 text-[#696053]" />
        <h2 className="font-serif font-bold text-xl text-[#29251F]">
          Cart is empty
        </h2>
        <Link
          href={`/store/${slug}`}
          className="text-xs font-bold text-[#C26B59] hover:underline"
        >
          Back to Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#D9BC9E] font-sans text-[#29251F]">
      {/* Navbar */}
      <Header cartCount={totalItems} />

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-6 pb-36 pt-16 sm:pt-20 md:pt-24 space-y-5">
        {/* Back to Cart navigation */}
        <div>
          <Link
            href={`/store/${slug}/cart`}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#29251F] hover:text-[#C26B59] transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F5EBDD] border border-[#91885D]/35 text-[#29251F] shadow-2xs">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span>Back to Cart</span>
          </Link>
        </div>

        <h1 className="font-serif font-bold text-2xl text-[#29251F]">
          Checkout
        </h1>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-[#A95145]/15 border border-[#A95145]/30 p-4 text-xs font-medium text-[#A95145] animate-in fade-in">
            <AlertCircle className="h-4 w-4 text-[#A95145] shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Kitchen Closed Warning */}
        {isClosed && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-[#A95145]/15 border border-[#A95145]/30 p-4 text-xs font-medium text-[#A95145]">
            <AlertCircle className="h-4 w-4 text-[#A95145] shrink-0 mt-0.5" />
            <span>
              The kitchen is currently closed. Orders cannot be placed at this time.
            </span>
          </div>
        )}

        {/* Minimum Order Warning */}
        {isBelowMinimum && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-[#91885D]/20 border border-[#91885D]/40 p-4 text-xs font-medium text-[#29251F]">
            <AlertCircle className="h-4 w-4 text-[#91885D] shrink-0 mt-0.5" />
            <span>
              Minimum order amount is {formatPrice(minimumOrder)}. Add{" "}
              {formatPrice(minimumOrder - subtotal)} more to continue.
            </span>
          </div>
        )}

        {/* ── 1. FULFILMENT METHOD (Delivery or Takeaway) ── */}
        <div className="rounded-3xl border border-[#91885D]/30 bg-[#F5EBDD] shadow-warm-sm p-5">
          <h2 className="font-serif font-bold text-base text-[#29251F] mb-4">
            Fulfilment Method
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                value: "delivery" as const,
                label: "Home Delivery",
                icon: Truck,
                sub:
                  isDeliveryChecked && isDeliveryAvailable && distanceKm !== null && deliveryCharge !== null
                    ? `${distanceKm} km (${formatPrice(deliveryCharge)})`
                    : "Distance-based fare",
                enabled: restaurant?.delivery_enabled ?? true,
              },
              {
                value: "takeaway" as const,
                label: "Takeaway / Pickup",
                icon: ShoppingBag,
                sub: "Free (₹0)",
                enabled: restaurant?.takeaway_enabled ?? true,
              },
            ].map(({ value, label, icon: Icon, sub, enabled }) => (
              <button
                key={value}
                type="button"
                disabled={!enabled}
                onClick={() => {
                  setOrderType(value);
                  if (value === "takeaway") {
                    setDeliveryCheckError(null);
                  }
                }}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all cursor-pointer ${
                  !enabled
                    ? "opacity-40 cursor-not-allowed border-[#91885D]/20 bg-[#E8D5BC]"
                    : orderType === value
                    ? "border-[#C26B59] bg-[#E8D5BC] shadow-xs"
                    : "border-[#91885D]/30 bg-[#F5EBDD] hover:border-[#C26B59]"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    orderType === value ? "text-[#C26B59]" : "text-[#696053]"
                  }`}
                />
                <span
                  className={`text-xs font-bold ${
                    orderType === value ? "text-[#C26B59]" : "text-[#29251F]"
                  }`}
                >
                  {label}
                </span>
                <span className="text-[10px] font-semibold text-[#696053]">
                  {sub}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── 2. RECEIVER'S CONTACT ── */}
        <div className="rounded-3xl border border-[#91885D]/30 bg-[#F5EBDD] shadow-warm-sm p-5 space-y-4">
          <h2 className="font-serif font-bold text-base text-[#29251F] flex items-center gap-2">
            <User className="h-4 w-4 text-[#C26B59]" />
            <span>Receiver&apos;s Contact</span>
          </h2>

          {/* Salutation + Receiver's Name */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#696053] block mb-1.5">
              Receiver&apos;s Name *
            </label>
            <div className="flex gap-2">
              <div className="relative shrink-0">
                <select
                  value={salutation}
                  onChange={(e) => setSalutation(e.target.value as "Mr" | "Ms" | "Mrs")}
                  aria-label="Salutation"
                  className="h-10 rounded-2xl border border-[#91885D]/35 bg-[#FAF6EF] px-3 text-xs font-bold text-[#29251F] focus:outline-none focus:ring-2 focus:ring-[#C26B59]/30 transition cursor-pointer"
                >
                  <option value="Mr">Mr</option>
                  <option value="Ms">Ms</option>
                  <option value="Mrs">Mrs</option>
                </select>
              </div>

              <div className="relative flex-1">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter full name"
                  className="w-full h-10 rounded-2xl border border-[#91885D]/35 bg-[#FAF6EF] px-4 text-xs text-[#29251F] placeholder:text-[#696053]/60 focus:outline-none focus:ring-2 focus:ring-[#C26B59]/30 transition"
                />
              </div>
            </div>
          </div>

          {/* Email ID */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#696053] block mb-1.5">
              Email ID (Optional)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-[#696053]">
                <Mail className="h-3.5 w-3.5" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. yourname@email.com"
                className="w-full h-10 rounded-2xl border border-[#91885D]/35 bg-[#FAF6EF] pl-9 pr-4 text-xs text-[#29251F] placeholder:text-[#696053]/60 focus:outline-none focus:ring-2 focus:ring-[#C26B59]/30 transition"
              />
            </div>
          </div>

          {/* Receiver's Mobile Number */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#696053] block mb-1.5">
              Receiver&apos;s Mobile Number *
            </label>
            <div className="flex gap-2">
              <div className="h-10 flex items-center justify-center px-3.5 rounded-2xl border border-[#91885D]/35 bg-[#FAF6EF] text-xs font-bold text-[#696053] shrink-0 select-none">
                <Phone className="h-3 w-3 mr-1 text-[#C26B59]" />
                +91
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                maxLength={10}
                placeholder="10-digit mobile number"
                className="flex-1 h-10 rounded-2xl border border-[#91885D]/35 bg-[#FAF6EF] px-4 text-xs text-[#29251F] placeholder:text-[#696053]/60 focus:outline-none focus:ring-2 focus:ring-[#C26B59]/30 transition tracking-wide font-medium"
              />
            </div>
          </div>

          {/* Add Alternate Mobile Number Toggle */}
          {!showAlternatePhone ? (
            <button
              type="button"
              onClick={() => setShowAlternatePhone(true)}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#A34B3D] hover:text-[#7A362B] transition-colors cursor-pointer pt-0.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add Alternate Mobile No.</span>
            </button>
          ) : (
            <div className="pt-1 animate-in fade-in space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#696053]">
                  Alternate Mobile Number (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowAlternatePhone(false);
                    setAlternatePhone("");
                  }}
                  className="text-[10px] font-bold text-rose-700 hover:text-rose-900 flex items-center gap-0.5 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                  <span>Remove</span>
                </button>
              </div>
              <div className="flex gap-2">
                <div className="h-10 flex items-center justify-center px-3.5 rounded-2xl border border-[#91885D]/35 bg-[#FAF6EF] text-xs font-bold text-[#696053] shrink-0 select-none">
                  +91
                </div>
                <input
                  type="tel"
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                  maxLength={10}
                  placeholder="Secondary mobile number"
                  className="flex-1 h-10 rounded-2xl border border-[#91885D]/35 bg-[#FAF6EF] px-4 text-xs text-[#29251F] placeholder:text-[#696053]/60 focus:outline-none focus:ring-2 focus:ring-[#C26B59]/30 transition"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── 3. RECEIVER'S ADDRESS (DELIVERY ONLY) ── */}
        {orderType === "delivery" && (
          <div className="rounded-3xl border border-[#91885D]/30 bg-[#F5EBDD] shadow-warm-sm p-5 space-y-4 animate-in fade-in">
            <h2 className="font-serif font-bold text-base text-[#29251F] flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#C26B59]" />
              <span>Receiver&apos;s Address</span>
            </h2>

            {/* Apartment, Flat, House no., Building, Company */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#696053] block mb-1.5">
                Apartment, Flat, House no., Building, Company *
              </label>
              <input
                type="text"
                value={flatBuilding}
                onChange={(e) => {
                  setFlatBuilding(e.target.value);
                  handleAddressFieldChange();
                }}
                required
                placeholder="e.g. FNP Vatika 75 / Flat 402, Tower B"
                className="w-full h-10 rounded-2xl border border-[#91885D]/35 bg-[#FAF6EF] px-4 text-xs text-[#29251F] placeholder:text-[#696053]/60 focus:outline-none focus:ring-2 focus:ring-[#C26B59]/30 transition"
              />
            </div>

            {/* Area, Street, Sector, Village (WITH LIVE AUTOCOMPLETE DROPDOWN) */}
            <div className="relative" ref={suggestionsRef}>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#696053] block mb-1.5">
                Area, Street, Sector, Village *
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={areaStreet}
                  onChange={(e) => {
                    setAreaStreet(e.target.value);
                    handleAddressFieldChange();
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  required
                  placeholder="e.g. Sector 51 / DLF Phase 4 / Golf Course Rd"
                  className="w-full h-10 rounded-2xl border border-[#91885D]/35 bg-[#FAF6EF] pl-4 pr-9 text-xs text-[#29251F] placeholder:text-[#696053]/60 focus:outline-none focus:ring-2 focus:ring-[#C26B59]/30 transition font-medium"
                />
                <span className="absolute right-3 text-[#696053]">
                  {isSearchingSuggestions ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#C26B59]" />
                  ) : (
                    <Search className="h-3.5 w-3.5" />
                  )}
                </span>
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1.5 max-h-56 overflow-y-auto rounded-2xl border border-[#91885D]/35 bg-[#FAF6EF] shadow-warm-lg p-1.5 divide-y divide-[#91885D]/15">
                  {suggestions.map((item, idx) => (
                    <button
                      key={`${item.title}-${idx}`}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-[#E8D5BC] transition-colors flex items-start gap-2.5 group cursor-pointer"
                    >
                      <MapPin className="h-3.5 w-3.5 text-[#C26B59] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#29251F] truncate group-hover:text-[#7A362B]">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-[#696053] truncate">
                          {item.subtitle}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Landmark */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#696053] block mb-1.5">
                Landmark (Optional)
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => {
                  setLandmark(e.target.value);
                  handleAddressFieldChange();
                }}
                placeholder="e.g. Near Artemis Hospital / Market"
                className="w-full h-10 rounded-2xl border border-[#91885D]/35 bg-[#FAF6EF] px-4 text-xs text-[#29251F] placeholder:text-[#696053]/60 focus:outline-none focus:ring-2 focus:ring-[#C26B59]/30 transition"
              />
            </div>

            {/* Pincode & City (Side-by-side) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#696053] block mb-1.5">
                  Pincode *
                </label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => {
                    setPincode(e.target.value);
                    handleAddressFieldChange();
                  }}
                  required
                  maxLength={6}
                  placeholder="e.g. 122001"
                  className="w-full h-10 rounded-2xl border border-[#91885D]/35 bg-[#FAF6EF] px-4 text-xs font-bold text-[#29251F] placeholder:text-[#696053]/60 focus:outline-none focus:ring-2 focus:ring-[#C26B59]/30 transition"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#696053] block mb-1.5">
                  City *
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    handleAddressFieldChange();
                  }}
                  required
                  placeholder="Gurugram"
                  className="w-full h-10 rounded-2xl border border-[#91885D]/35 bg-[#FAF6EF] px-4 text-xs font-bold text-[#29251F] placeholder:text-[#696053]/60 focus:outline-none focus:ring-2 focus:ring-[#C26B59]/30 transition"
                />
              </div>
            </div>

            {/* Address Type Selection Pills */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#696053] block mb-2">
                Save Address As
              </label>
              <div className="flex items-center gap-2.5">
                {[
                  { id: "home", label: "Home", icon: Home },
                  { id: "office", label: "Office", icon: Building2 },
                  { id: "other", label: "Other", icon: Navigation },
                ].map((type) => {
                  const Icon = type.icon;
                  const isSelected = addressType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setAddressType(type.id as "home" | "office" | "other")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
                        isSelected
                          ? "bg-[#C26B59] text-[#FAF5ED] border-[#C26B59] shadow-2xs scale-[1.02]"
                          : "bg-[#FAF6EF] text-[#554D3F] border-[#91885D]/35 hover:border-[#C26B59]"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Check Delivery Action & Status Box */}
            <div className="space-y-2 pt-2 border-t border-[#91885D]/20">
              <button
                type="button"
                onClick={handleCheckDelivery}
                disabled={isCheckingDelivery || !flatBuilding.trim() || !areaStreet.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#634832] hover:bg-[#523B28] text-[#F5EBDD] py-3 text-xs font-bold shadow-xs hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] cursor-pointer"
              >
                {isCheckingDelivery ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Checking delivery availability...</span>
                  </>
                ) : (
                  <>
                    <Truck className="h-4 w-4 text-[#F5EBDD]" />
                    <span>{isDeliveryChecked && isDeliveryAvailable ? "Re-verify Delivery Distance" : "Check Delivery"}</span>
                  </>
                )}
              </button>

              {/* Delivery Availability Verified Card */}
              {isDeliveryChecked && isDeliveryAvailable && distanceKm !== null && deliveryCharge !== null && (
                <div className="flex items-start gap-2.5 rounded-2xl bg-[#4D7C47]/10 border border-[#4D7C47]/30 p-3.5 text-xs text-[#2D5A27] animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 text-[#4D7C47] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold flex items-center gap-1.5">
                      <span>✓ Delivery available to your address</span>
                    </p>
                    <p className="text-[11px] text-[#3E362A] mt-0.5">
                      Road Distance: <span className="font-bold">{distanceKm} km</span> • Delivery Charge: <span className="font-bold text-[#A34B3D]">{formatPrice(deliveryCharge)}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Delivery Error Card */}
              {deliveryCheckError && (
                <div className="flex items-start gap-2 rounded-2xl bg-[#A95145]/10 border border-[#A95145]/30 p-3.5 text-xs text-[#A95145] animate-in fade-in">
                  <AlertCircle className="h-4 w-4 text-[#A95145] shrink-0 mt-0.5" />
                  <span>{deliveryCheckError}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 4. ORDER SUMMARY ── */}
        <div className="rounded-3xl border border-[#91885D]/30 bg-[#F5EBDD] shadow-warm-sm p-5 space-y-3">
          <h2 className="font-serif font-bold text-base text-[#29251F]">
            Order Summary
          </h2>
          <div className="space-y-2.5">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2.5 text-xs"
              >
                {item.product.image_url ? (
                  <div className="relative h-9 w-9 shrink-0 rounded-lg overflow-hidden bg-[#E8D5BC] border border-[#91885D]/20 mt-0.5">
                    <Image
                      src={item.product.image_url}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                      sizes="36px"
                    />
                  </div>
                ) : (
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-[#E8D5BC] flex items-center justify-center mt-0.5">
                    <Utensils className="h-3.5 w-3.5 text-[#696053]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[#29251F] font-semibold leading-tight">
                    {item.product.name}{" "}
                    <span className="text-[#696053] font-normal">× {item.quantity}</span>
                  </p>
                  {item.sizeLabel && (
                    <p className="text-[10px] text-[#7A6B5A]">
                      Size: {item.sizeLabel}
                    </p>
                  )}
                  {item.addons && item.addons.length > 0 && (
                    <p className="text-[10px] text-[#696053]">
                      + {item.addons.map((a) => `${a.label}`).join(", ")}
                    </p>
                  )}
                </div>
                <span className="font-bold text-[#29251F] shrink-0">
                  {formatPrice(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-[#91885D]/25 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-[#696053]">
              <span>Subtotal ({totalItems} items)</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#696053]">
              <span>Delivery fee</span>
              <span>
                {orderType === "takeaway"
                  ? "₹0 (Free)"
                  : isDeliveryChecked && isDeliveryAvailable && deliveryCharge !== null
                  ? formatPrice(deliveryCharge)
                  : "Click 'Check Delivery'"}
              </span>
            </div>
            <div className="flex justify-between text-[#696053]">
              <span>Packing &amp; Handling (4%)</span>
              <span>+{formatPrice(packagingFee)}</span>
            </div>
            {hasGiftNote && (
              <div className="flex justify-between text-[#C26B59] font-medium">
                <span>Gift Note &amp; Ribbon</span>
                <span>+{formatPrice(giftNoteFee)}</span>
              </div>
            )}
            <div className="flex justify-between font-serif font-bold text-base text-[#29251F] pt-2 border-t border-[#91885D]/25">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-2xl bg-[#E8D5BC] border border-[#91885D]/30 p-4 text-xs text-[#29251F]/80 space-y-1.5">
          <p className="font-bold text-[#29251F] text-xs">How it works</p>
          <p>1. Tap &ldquo;Place Order via WhatsApp&rdquo; below.</p>
          <p>2. WhatsApp will open with your order pre-filled.</p>
          <p>3. Send the message to notify the kitchen.</p>
          <p>4. Wait for confirmation from The Indulgent Spoon.</p>
        </div>
      </form>

      {/* Floating Bottom Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-[#D9BC9E] via-[#D9BC9E]/90 to-transparent pt-8">
        <div className="max-w-lg mx-auto">
          <button
            type="submit"
            form=""
            onClick={handleSubmit}
            disabled={submitting || !canCheckout}
            className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-[#C26B59] hover:bg-[#A95145] text-[#F5EBDD] py-4 text-sm font-black shadow-warm-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Placing Order...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span>Place {orderType === "delivery" ? "Delivery" : "Takeaway"} Order via WhatsApp</span>
              </>
            )}
          </button>
          {!isClosed && !isBelowMinimum && (
            <p className="text-center text-[10px] text-[#696053] mt-2">
              {orderType === "delivery" && (!isDeliveryChecked || !isDeliveryAvailable)
                ? "Please enter your address and click \"Check Delivery\" to proceed."
                : "Your order will open in WhatsApp for confirmation."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
