"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCart } from "@/lib/store/CartContext";
import { createOrder } from "@/app/store/[slug]/actions";
import { formatPrice } from "@/lib/utils";
import { getProductOrderLimit } from "@/lib/order-limit";
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
  Mail,
  Home,
  Building2,
  Calendar,
  Clock,
  ShieldCheck,
  ChefHat,
  Leaf,
  Trash2,
  Minus,
  Plus,
  Lock,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Gift,
  Search,
  Check,
  CheckCircle2,
  Sparkles,
  Tag,
  Percent,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getCustomerDeliverySlots,
  formatSlotWindow,
  isSourdoughOrFocaccia,
  getSourdoughSlotInfo,
} from "@/lib/delivery-slots-service";
import type { DeliverySlot } from "@/types/database";
import { getProductDiscount } from "@/lib/discount";

function formatBakingPeriod(hours: number | null | undefined): string {
  if (hours == null || hours <= 0) return "";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours === 1) return "1 hr";
  if (hours < 24) return `${hours} hrs`;
  const days = hours / 24;
  if (Number.isInteger(days)) return `${days} day${days !== 1 ? "s" : ""}`;
  return `${hours} hrs`;
}

interface AddressSuggestion {
  title: string;
  subtitle: string;
  city: string;
  postcode: string;
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function CheckoutPageClient() {
  const params = useParams();
  const slug = (params?.slug as string) || "the-indulgent-spoon";
  const {
    items,
    totalItems,
    subtotal,
    packagingFee,
    giftNoteFee,
    hasGiftNote,
    giftNote,
    increment,
    decrement,
    removeItem,
    clearCart,
  } = useCart();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);

  // Fulfilment Method
  const [orderType, setOrderType] = useState<"delivery" | "takeaway">("delivery");

  // Recipient's Contact
  const [salutation, setSalutation] = useState<"Mr" | "Ms" | "Mrs">("Mr");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [showAlternatePhone, setShowAlternatePhone] = useState(false);
  const [alternatePhone, setAlternatePhone] = useState("");

  // Delivery Address
  const [flatBuilding, setFlatBuilding] = useState("");
  const [areaStreet, setAreaStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("Gurugram");
  const [addressType] = useState<"home" | "office" | "other">("home");

  // Delivery Date & Time Slot State
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [slotsByDate, setSlotsByDate] = useState<Record<string, DeliverySlot[]>>({});
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showSlotDropdown, setShowSlotDropdown] = useState(false);

  // Coupon code state
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountPercent: number;
    minOrderAmount: number;
  } | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const [cartBakingInfo, setCartBakingInfo] = useState<{
    maxHours: number;
    maxCategoryName: string;
    categoryList: { name: string; hours: number }[];
  } | null>(null);

  const hasSourdoughInCart = useMemo(() => {
    return items.some((i) => isSourdoughOrFocaccia(i.product));
  }, [items]);

  const sourdoughSlotInfo = useMemo(() => {
    return hasSourdoughInCart ? getSourdoughSlotInfo() : null;
  }, [hasSourdoughInCart]);

  const totalDiscountSavings = useMemo(() => {
    return items.reduce((sum, item) => {
      const disc = getProductDiscount(item.product);
      return sum + disc.savings * item.quantity;
    }, 0);
  }, [items]);

  // Autocomplete Suggestions State
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Delivery Distance Calculation
  const [isCheckingDelivery, setIsCheckingDelivery] = useState(false);
  const [isDeliveryChecked, setIsDeliveryChecked] = useState(false);
  const [isDeliveryAvailable, setIsDeliveryAvailable] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [deliveryCharge, setDeliveryCharge] = useState<number | null>(null);
  const [deliverySurges, setDeliverySurges] = useState<Array<{ name: string; amount: number }>>([]);
  const [deliveryNotice, setDeliveryNotice] = useState<string | null>(null);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const router = useRouter();

  // Load restaurant details
  useEffect(() => {
    async function fetchRestaurant() {
      const supabase = createClient();
      const { data } = await supabase
        .from("restaurants")
        .select("*")
        .eq("slug", slug)
        .single();
      if (data) {
        setRestaurant(data as Restaurant);
      } else {
        const { data: fallbackRest } = await supabase
          .from("restaurants")
          .select("*")
          .limit(1)
          .single();
        if (fallbackRest) setRestaurant(fallbackRest as Restaurant);
      }
      setLoadingRestaurant(false);
    }
    fetchRestaurant();
  }, [slug]);

  // Load available delivery slots with baking time calculation
  useEffect(() => {
    async function fetchSlots() {
      if (!restaurant?.id) return;
      try {
        setLoadingSlots(true);

        let categoryIds = Array.from(
          new Set(items.map((i) => i.product.category_id).filter(Boolean))
        ) as string[];

        const supabase = createClient();
        const productIds = items.map((i) => i.product.id).filter(Boolean);
        if (productIds.length > 0 && categoryIds.length < items.length) {
          try {
            const { data: prods } = await supabase
              .from("products")
              .select("id, category_id")
              .in("id", productIds);
            if (prods) {
              const extraCatIds = prods.map((p) => p.category_id).filter(Boolean) as string[];
              categoryIds = Array.from(new Set([...categoryIds, ...extraCatIds]));
            }
          } catch {}
        }

        let maxBakingHours = 0;
        let maxCategoryName = "";
        const categoryBakingList: { name: string; hours: number }[] = [];

        if (categoryIds.length > 0) {
          try {
            const { data: cats } = await supabase
              .from("categories")
              .select("id, name, baking_period_hours")
              .in("id", categoryIds);

            if (cats && cats.length > 0) {
              for (const cat of cats) {
                const hours = Number(cat.baking_period_hours) || 0;
                if (hours > 0) {
                  categoryBakingList.push({ name: cat.name, hours });
                  if (hours > maxBakingHours) {
                    maxBakingHours = hours;
                    maxCategoryName = cat.name;
                  }
                }
              }
            }
          } catch (e) {
            console.warn("Failed to fetch category baking times:", e);
          }
        }

        if (maxBakingHours > 0) {
          setCartBakingInfo({
            maxHours: maxBakingHours,
            maxCategoryName,
            categoryList: categoryBakingList,
          });
        } else {
          setCartBakingInfo(null);
        }

        const bakingPeriodMinutes = maxBakingHours > 0 ? Math.round(maxBakingHours * 60) : 60;
        const hasSourdough = items.some((i) => isSourdoughOrFocaccia(i.product));

        const slotData = await getCustomerDeliverySlots(
          restaurant.id,
          categoryIds,
          hasSourdough ? 2 : 5,
          bakingPeriodMinutes,
          hasSourdough
        );

        setAvailableDates(slotData.dates);
        setSlotsByDate(slotData.slotsByDate);

        if (slotData.dates.length > 0) {
          const firstDate = slotData.dates[0];
          setSelectedDate(firstDate);
          const firstDaySlots = slotData.slotsByDate[firstDate] || [];
          if (firstDaySlots.length > 0) {
            setSelectedSlot(firstDaySlots[0]);
          } else {
            setSelectedSlot(null);
          }
        } else {
          setSelectedDate("");
          setSelectedSlot(null);
        }
      } catch (err) {
        console.error("Error loading delivery slots:", err);
      } finally {
        setLoadingSlots(false);
      }
    }

    fetchSlots();
  }, [restaurant?.id, items]);

  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr);
    const daySlots = slotsByDate[dateStr] || [];
    if (daySlots.length > 0) {
      setSelectedSlot(daySlots[0]);
    } else {
      setSelectedSlot(null);
    }
  };

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

  // Live address suggestions when typing in Area / Street
  useEffect(() => {
    const query = areaStreet.trim();
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const lower = query.toLowerCase();
    if (lower.includes("noida") && city !== "Noida") {
      setCity("Noida");
    } else if ((lower.includes("delhi") || lower.includes("new delhi")) && city !== "Delhi") {
      setCity("Delhi");
    } else if ((lower.includes("gurugram") || lower.includes("gurgaon")) && city !== "Gurugram") {
      setCity("Gurugram");
    } else if (lower.includes("faridabad") && city !== "Faridabad") {
      setCity("Faridabad");
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingSuggestions(true);
        const res = await fetch(
          `/api/address-suggestions?q=${encodeURIComponent(query)}&city=${encodeURIComponent(city)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          if (data.suggestions && data.suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }
      } catch {
        // ignore
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [areaStreet, city]);

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

  const handleSelectSuggestion = (item: AddressSuggestion) => {
    setAreaStreet(item.title);
    if (item.postcode) setPincode(item.postcode);
    if (item.city) setCity(item.city);
    setShowSuggestions(false);
  };

  // Automatic Seamless Delivery Calculation
  useEffect(() => {
    if (orderType !== "delivery") {
      setIsDeliveryChecked(true);
      setIsDeliveryAvailable(true);
      setDeliveryCharge(0);
      setDistanceKm(0);
      setDeliverySurges([]);
      setDeliveryNotice(null);
      return;
    }

    const effectiveArea = areaStreet.trim();
    const effectivePincode = pincode.trim();

    if (effectiveArea.length < 3 && effectivePincode.length < 5) {
      setIsDeliveryChecked(false);
      setIsDeliveryAvailable(false);
      setDeliveryCharge(null);
      setDistanceKm(null);
      setDeliveryNotice(null);
      return;
    }

    let effectiveCity = city.trim();
    const areaLower = effectiveArea.toLowerCase();
    const cityLower = effectiveCity.toLowerCase();

    if (
      cityLower === "noida" ||
      cityLower.includes("noida") ||
      areaLower.includes("noida") ||
      effectivePincode.startsWith("201")
    ) {
      effectiveCity = "Noida";
    } else if (
      cityLower === "delhi" ||
      areaLower.includes("delhi") ||
      areaLower.includes("new delhi") ||
      (effectivePincode.startsWith("11") && cityLower !== "noida")
    ) {
      effectiveCity = "Delhi";
    } else if (
      cityLower === "faridabad" ||
      areaLower.includes("faridabad") ||
      effectivePincode.startsWith("121")
    ) {
      effectiveCity = "Faridabad";
    } else if (
      cityLower === "gurugram" ||
      cityLower === "gurgaon" ||
      areaLower.includes("gurugram") ||
      areaLower.includes("gurgaon") ||
      effectivePincode.startsWith("122")
    ) {
      effectiveCity = "Gurugram";
    }

    const fullAddr = [
      flatBuilding.trim(),
      effectiveArea,
      landmark.trim() ? `Near ${landmark.trim()}` : null,
      effectiveCity,
      effectivePincode,
    ]
      .filter(Boolean)
      .join(", ");

    const timer = setTimeout(async () => {
      try {
        setIsCheckingDelivery(true);
        const res = await fetch("/api/delivery-distance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: fullAddr,
            flatBuilding: flatBuilding.trim(),
            areaStreet: effectiveArea,
            landmark: landmark.trim(),
            pincode: effectivePincode,
            city: effectiveCity,
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setIsDeliveryChecked(true);
          setIsDeliveryAvailable(Boolean(data.available));
          setDistanceKm(data.distanceKm ?? null);
          setDeliveryCharge(data.available ? data.deliveryCharge : null);
          setDeliverySurges(data.surges || []);
          setDeliveryNotice(
            data.available ? null : data.error || "Location beyond 50 km delivery limit"
          );
        } else {
          setIsDeliveryChecked(false);
          setIsDeliveryAvailable(false);
          setDeliveryCharge(null);
          setDistanceKm(null);
          setDeliveryNotice(null);
        }
      } catch {
        // silent calculation retry
      } finally {
        setIsCheckingDelivery(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [flatBuilding, areaStreet, landmark, pincode, city, orderType]);

  const effectiveDeliveryCharge =
    orderType === "delivery" && isDeliveryAvailable && deliveryCharge !== null
      ? deliveryCharge
      : 0;

  const currentGiftFee = hasGiftNote ? giftNoteFee : 0;
  const total = Math.max(
    0,
    subtotal + effectiveDeliveryCharge + packagingFee + currentGiftFee - discountAmount
  );

  // Dynamically re-evaluate applied coupon if cart subtotal changes
  useEffect(() => {
    if (!appliedCoupon) return;

    if (appliedCoupon.minOrderAmount > 0 && subtotal < appliedCoupon.minOrderAmount) {
      const shortage = appliedCoupon.minOrderAmount - subtotal;
      setDiscountAmount(0);
      setCouponMessage({
        type: "error",
        text: `Add ₹${shortage} more to avail coupon "${appliedCoupon.code}" (Min order ₹${appliedCoupon.minOrderAmount})`,
      });
    } else {
      const newDiscount = Math.max(
        0,
        Math.round((subtotal * appliedCoupon.discountPercent) / 100)
      );
      setDiscountAmount(newDiscount);
      setCouponMessage({
        type: "success",
        text: `Coupon "${appliedCoupon.code}" applied! You saved ₹${newDiscount} (${appliedCoupon.discountPercent}% off)`,
      });
    }
  }, [subtotal, appliedCoupon]);
  const handlePhoneChange = (val: string) => {
    let digits = val.replace(/\D/g, "");
    if (digits.startsWith("91") && digits.length > 10) {
      digits = digits.slice(2);
    } else if (digits.startsWith("0") && digits.length > 10) {
      digits = digits.slice(1);
    }
    setPhone(digits.slice(0, 10));
    if (errorMsg) setErrorMsg(null);
  };

  const handleAlternatePhoneChange = (val: string) => {
    let digits = val.replace(/\D/g, "");
    if (digits.startsWith("91") && digits.length > 10) {
      digits = digits.slice(2);
    } else if (digits.startsWith("0") && digits.length > 10) {
      digits = digits.slice(1);
    }
    setAlternatePhone(digits.slice(0, 10));
  };

  const minimumOrder = restaurant?.minimum_order ?? 0;

  // Validation
  const isBelowMinimum = minimumOrder > 0 && subtotal < minimumOrder;
  const isClosed = restaurant && !restaurant.is_open;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const cleanPhone = phone.trim().replace(/\D/g, "");
  const isContactValid =
    name.trim().length >= 2 &&
    cleanPhone.length === 10 &&
    isEmailValid;

  const isAddressValid =
    orderType === "takeaway" ||
    ((flatBuilding.trim().length >= 1 || areaStreet.trim().length >= 3) &&
      pincode.trim().length >= 5 &&
      isDeliveryAvailable);

  const isSlotValid = Boolean(selectedDate) && Boolean(selectedSlot);

  const hasExceededProdLimit = useMemo(() => {
    return items.some((item) => {
      const limit = getProductOrderLimit(item.product);
      if (limit == null || limit <= 0) return false;
      const totalThisProd = items
        .filter((i) => (i.product?.id || i.id) === item.product.id)
        .reduce((sum, i) => sum + i.quantity, 0);
      return totalThisProd > limit;
    });
  }, [items]);

  const canCheckout =
    !isClosed &&
    !isBelowMinimum &&
    !hasExceededProdLimit &&
    totalItems > 0 &&
    isContactValid &&
    isAddressValid &&
    isSlotValid;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = couponCode.trim().toUpperCase();
    if (!cleanCode) {
      setCouponMessage({
        type: "error",
        text: "Please enter a coupon code.",
      });
      return;
    }

    setValidatingCoupon(true);
    setCouponMessage(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleanCode, subtotal }),
      });
      const data = await res.json();

      if (!res.ok || !data.valid) {
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setCouponMessage({
          type: "error",
          text: data?.error || "Invalid or expired coupon code.",
        });
      } else {
        setAppliedCoupon({
          code: data.coupon.code,
          discountPercent: data.coupon.discountPercent,
          minOrderAmount: data.coupon.minOrderAmount,
        });
        setDiscountAmount(data.discountAmount);
        setCouponMessage({
          type: "success",
          text: data.message,
        });
      }
    } catch {
      setCouponMessage({
        type: "error",
        text: "Failed to validate coupon. Please check connection and try again.",
      });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode("");
    setCouponMessage(null);
  };

  // Launch Razorpay
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!restaurant) {
      setErrorMsg("Loading store details... please wait a second and try again.");
      return;
    }

    if (totalItems === 0) {
      setErrorMsg("Your cart is empty. Please add items to checkout.");
      return;
    }

    if (isClosed) {
      setErrorMsg("Our bakery is currently closed for new orders. Please check back soon.");
      return;
    }

    if (isBelowMinimum) {
      setErrorMsg(
        `Minimum order amount is ${formatPrice(minimumOrder)}. Please add items worth ${formatPrice(
          minimumOrder - subtotal
        )} more to continue.`
      );
      return;
    }

    if (hasExceededProdLimit) {
      setErrorMsg(
        "One or more items in your cart exceed the daily order limit. Please adjust your cart before checkout."
      );
      return;
    }

    // Contact Details Validation
    if (!name.trim() || name.trim().length < 2) {
      setErrorMsg("Please enter your full name.");
      const el = document.getElementById("customer-name");
      el?.focus();
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const currentDigits = phone.trim().replace(/\D/g, "");
    if (!currentDigits || currentDigits.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      const el = document.getElementById("customer-phone");
      el?.focus();
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailPattern.test(email.trim())) {
      setErrorMsg("Please enter a valid email address (e.g. name@example.com) for order updates and receipt.");
      const el = document.getElementById("customer-email");
      el?.focus();
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Delivery Address Validation
    if (orderType === "delivery") {
      if (!areaStreet.trim() || areaStreet.trim().length < 2) {
        setErrorMsg("Please enter your delivery Area, Street, or Sector.");
        const el = document.getElementById("delivery-area");
        el?.focus();
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      if (!pincode.trim() || pincode.trim().length < 5) {
        setErrorMsg("Please enter a valid 6-digit Pincode.");
        const el = document.getElementById("delivery-pincode");
        el?.focus();
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      if (isCheckingDelivery) {
        setErrorMsg("Calculating delivery distance and fee, please wait a moment...");
        return;
      }

      if (isDeliveryChecked && !isDeliveryAvailable) {
        setErrorMsg(
          deliveryNotice || "Sorry, we currently deliver only within 50 km from our bakery."
        );
        const el = document.getElementById("delivery-address-card");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      if (!isDeliveryChecked && !isDeliveryAvailable) {
        setErrorMsg("Please enter a valid delivery address within our 50 km delivery radius.");
        const el = document.getElementById("delivery-area");
        el?.focus();
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }

    // Slot Validation
    if (!selectedDate) {
      setErrorMsg("Please select a delivery date.");
      const el = document.getElementById("delivery-schedule-card");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!selectedSlot) {
      setErrorMsg("Please select an available delivery time slot for the selected date.");
      const el = document.getElementById("delivery-schedule-card");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const fullAddr = getFullAddress();
    const formattedCustomerName = `${salutation} ${name.trim()}`;

    const formattedSlotWindow = selectedSlot
      ? formatSlotWindow(selectedSlot.start_time, selectedSlot.end_time)
      : undefined;

    const hasSlotData = Boolean(selectedSlot) && Boolean(selectedDate);

    try {
      const result = await createOrder({
        orderType,
        customerName: formattedCustomerName,
        customerPhone: phone.trim(),
        customerEmail: email.trim() || undefined,
        alternatePhone: alternatePhone.trim() || undefined,
        deliveryAddress: orderType === "delivery" ? fullAddr : "",
        addressType: orderType === "delivery" ? addressType : undefined,
        deliverySlotId: hasSlotData && selectedSlot ? selectedSlot.id : undefined,
        deliveryDate: hasSlotData ? selectedDate : undefined,
        deliveryTimeSlot: hasSlotData ? formattedSlotWindow : undefined,
        deliveryStartTime: hasSlotData && selectedSlot ? selectedSlot.start_time : undefined,
        deliveryEndTime: hasSlotData && selectedSlot ? selectedSlot.end_time : undefined,
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
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        discountAmount,
      });

      if (!result.success || !result.orderId) {
        throw new Error(result.error || "Failed to create order. Please try again.");
      }

      const receiptData = {
        orderId:
          result.orderNumber ||
          result.orderId ||
          Math.random().toString(36).substring(2, 8).toUpperCase(),
        createdAt: new Date().toISOString(),
        orderType,
        customerName: formattedCustomerName,
        customerPhone: phone.trim(),
        customerEmail: email.trim() || null,
        alternatePhone: alternatePhone.trim() || null,
        deliveryAddress: orderType === "delivery" ? fullAddr : null,
        addressType: orderType === "delivery" ? addressType : null,
        deliveryDate: hasSlotData ? selectedDate : null,
        deliveryTimeSlot: hasSlotData ? formattedSlotWindow : null,
        distanceKm: orderType === "delivery" ? distanceKm : null,
        items: items.map((i) => ({
          id: i.id,
          name: i.product.name,
          image_url: i.product.image_url,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          sizeLabel: i.sizeLabel,
          addons: i.addons,
        })),
        subtotal,
        deliveryCharge: effectiveDeliveryCharge,
        packagingFee,
        hasGiftNote,
        giftNote,
        giftNoteFee: hasGiftNote ? giftNoteFee : 0,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        discountAmount,
        total,
        whatsappUrl: result.whatsappUrl,
        restaurantName: restaurant.name || "The Indulgent Spoon",
        restaurantPhone: restaurant.whatsapp_number,
        paymentStatus: "PENDING",
        paymentMethod: "Online / UPI",
        trackingToken: result.trackingToken || result.orderId,
      };

      try {
        sessionStorage.setItem(`receipt-${slug}`, JSON.stringify(receiptData));
        if (result.orderId) {
          sessionStorage.setItem(`order-${slug}`, result.orderId);
        }
      } catch (e) {
        console.error("Failed to store receipt in session:", e);
      }

      // Launch Razorpay
      try {
        const rzpRes = await fetch("/api/razorpay/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: total,
            orderId: result.orderId,
            customerName: formattedCustomerName,
            customerPhone: phone.trim(),
            customerEmail: email.trim(),
          }),
        });

        const rzpData = await rzpRes.json();

        if (!rzpRes.ok || !rzpData.success) {
          throw new Error(
            rzpData?.error || "Failed to initialize Razorpay payment order. Please try again."
          );
        }

        const isScriptLoaded = await loadRazorpayScript();

        if (!isScriptLoaded || typeof window === "undefined" || !(window as any).Razorpay) {
          throw new Error(
            "Razorpay checkout failed to load. Please check your internet connection and try again."
          );
        }

        const rzpOptions = {
          key: rzpData.keyId,
          amount: rzpData.amount,
          currency: rzpData.currency || "INR",
          name: "The Indulgent Spoon",
          description: `Order #${result.orderNumber || result.orderId}`,
          image: "/logo-m.png",
          order_id:
            rzpData.orderId && !rzpData.orderId.startsWith("order_sim_")
              ? rzpData.orderId
              : undefined,
          prefill: {
            name: formattedCustomerName,
            contact: phone.trim(),
            email: email.trim(),
          },
          theme: {
            color: "#394231",
          },
          handler: async function (response: any) {
            try {
              setSubmitting(true);
              setIsGeneratingReceipt(true);
              await fetch("/api/razorpay/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response?.razorpay_order_id || rzpData.orderId,
                  razorpay_payment_id:
                    response?.razorpay_payment_id || `pay_${Date.now()}`,
                  razorpay_signature:
                    response?.razorpay_signature || "simulated_sig",
                  orderId: result.orderId,
                  trackingToken: result.trackingToken,
                }),
              });

              receiptData.paymentStatus = "PAID";
              try {
                sessionStorage.setItem(`receipt-${slug}`, JSON.stringify(receiptData));
                sessionStorage.setItem("receipt-the-indulgent-spoon", JSON.stringify(receiptData));
              } catch {}

              clearCart();
              router.push("/order-success");
            } catch (e) {
              console.error("Razorpay post-payment handler error:", e);
              clearCart();
              router.push("/order-success");
            }
          },
          modal: {
            ondismiss: function () {
              setSubmitting(false);
            },
          },
        };

        const rzpInstance = new (window as any).Razorpay(rzpOptions);
        rzpInstance.open();
        setSubmitting(false);
        return;
      } catch (rzpErr) {
        console.warn("Razorpay launch notice:", rzpErr);
        setErrorMsg(
          rzpErr instanceof Error
            ? rzpErr.message
            : "Payment gateway could not be loaded. Please try again."
        );
        setSubmitting(false);
        return;
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (loadingRestaurant) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#9C4133]" />
      </div>
    );
  }

  if (totalItems === 0) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <ShoppingBag className="h-12 w-12 text-[#7A6E5D]" />
        <h2 className="font-serif font-bold text-xl text-[#29251F]">Your cart is empty</h2>
        <Link
          href={`/store/${slug}`}
          className="text-xs font-bold text-[#9C4133] hover:underline"
        >
          Back to Menu
        </Link>
      </div>
    );
  }

  const getDateCardDetails = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return {
        dayName: d.toLocaleDateString("en-IN", { weekday: "short" }),
        dayNum: d.getDate(),
        monthName: d.toLocaleDateString("en-IN", { month: "short" }),
      };
    } catch {
      return { dayName: "Day", dayNum: 1, monthName: "Slot" };
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#29251F] font-sans pb-36 sm:pb-32">
      {/* ── HEADER ── */}
      <header className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-3 flex items-center justify-between">
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#29251F] hover:text-[#9C4133] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to cart</span>
        </Link>

        <h1 className="font-serif text-lg font-bold text-[#29251F] tracking-tight">
          Checkout
        </h1>

        <Link
          href="/cart"
          className="relative p-1 text-[#9C4133] hover:opacity-85 transition"
          aria-label="View Cart"
        >
          <ShoppingBag className="h-5 w-5" />
          <span className="absolute -top-1.5 -right-2 bg-[#9C4133] text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center shadow-xs">
            {totalItems}
          </span>
        </Link>
      </header>

      {/* ── GLOBAL ERROR ALERT ── */}
      {errorMsg && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-4">
          <div className="flex items-start gap-2.5 rounded-2xl bg-[#9C4133]/10 border border-[#9C4133]/30 p-3.5 text-xs font-medium text-[#9C4133] animate-in fade-in">
            <AlertCircle className="h-4 w-4 text-[#9C4133] shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* ── SINGLE-PAGE 2-COLUMN CHECKOUT LAYOUT ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* ═══════════════════════════════════════════════════════════
              LEFT COLUMN: FORM SECTIONS (Cards matching reference photo)
              ═══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Delivery Method Card */}
            <div className="bg-white border border-[#EBE4D8] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FFF1EB] text-[#A03B2A] flex items-center justify-center shrink-0">
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-serif font-bold text-base text-[#29251F] leading-tight">
                    Delivery Method
                  </h2>
                  <p className="text-xs text-[#7A6E5D] mt-0.5">
                    Choose how you want to receive your order
                  </p>
                </div>
              </div>

              {/* 2 Options Side-by-Side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Home Delivery Card */}
                <button
                  type="button"
                  onClick={() => setOrderType("delivery")}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    orderType === "delivery"
                      ? "border-[#A03B2A] bg-[#FFF8F5] shadow-xs"
                      : "border-[#EBE4D8] bg-white hover:border-[#A03B2A]/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        orderType === "delivery"
                          ? "bg-[#FFF1EB] text-[#A03B2A]"
                          : "bg-[#F7EFE4] text-[#7A6E5D]"
                      }`}
                    >
                      <Truck className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p
                        className={`text-xs font-bold leading-tight ${
                          orderType === "delivery" ? "text-[#A03B2A]" : "text-[#29251F]"
                        }`}
                      >
                        Home Delivery
                      </p>
                      <p className="text-[10px] text-[#7A6E5D] mt-0.5">Distance-based fare</p>
                    </div>
                  </div>

                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      orderType === "delivery" ? "border-[#A03B2A]" : "border-[#91885D]/40"
                    }`}
                  >
                    {orderType === "delivery" && (
                      <div className="w-2 h-2 rounded-full bg-[#A03B2A]" />
                    )}
                  </div>
                </button>

                {/* Takeaway / Pickup Card */}
                <button
                  type="button"
                  onClick={() => setOrderType("takeaway")}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    orderType === "takeaway"
                      ? "border-[#A03B2A] bg-[#FFF8F5] shadow-xs"
                      : "border-[#EBE4D8] bg-white hover:border-[#A03B2A]/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        orderType === "takeaway"
                          ? "bg-[#FFF1EB] text-[#A03B2A]"
                          : "bg-[#F7EFE4] text-[#7A6E5D]"
                      }`}
                    >
                      <ShoppingBag className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p
                        className={`text-xs font-bold leading-tight ${
                          orderType === "takeaway" ? "text-[#A03B2A]" : "text-[#29251F]"
                        }`}
                      >
                        Takeaway / Pickup
                      </p>
                      <p className="text-[10px] text-[#7A6E5D] mt-0.5">Free (₹0)</p>
                    </div>
                  </div>

                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      orderType === "takeaway" ? "border-[#A03B2A]" : "border-[#91885D]/40"
                    }`}
                  >
                    {orderType === "takeaway" && (
                      <div className="w-2 h-2 rounded-full bg-[#A03B2A]" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Recipient's Contact Card */}
            <div className="bg-white border border-[#EBE4D8] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FFF1EB] text-[#A03B2A] flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-serif font-bold text-base text-[#29251F] leading-tight">
                    Recipient&apos;s Contact
                  </h2>
                  <p className="text-xs text-[#7A6E5D] mt-0.5">
                    We&apos;ll use these details to share order updates and payment receipt.
                  </p>
                </div>
              </div>

              {/* Title Dropdown + Full Name */}
              <div>
                <label htmlFor="customer-name" className="text-[11px] font-bold text-[#696053] block mb-1">
                  Full Name <span className="text-[#A03B2A]">*</span>
                </label>
                <div className="flex gap-2.5">
                  <div className="relative w-24 shrink-0">
                    <select
                      value={salutation}
                      onChange={(e) => setSalutation(e.target.value as "Mr" | "Ms" | "Mrs")}
                      aria-label="Salutation"
                      className="w-full h-11 appearance-none rounded-xl border border-[#EBE4D8] bg-white px-3.5 text-xs font-semibold text-[#29251F] focus:outline-none focus:ring-1 focus:ring-[#A03B2A] cursor-pointer"
                    >
                      <option value="Mr">Mr</option>
                      <option value="Ms">Ms</option>
                      <option value="Mrs">Mrs</option>
                    </select>
                    <ChevronDown className="h-3.5 w-3.5 text-[#7A6E5D] absolute right-3 top-4 pointer-events-none" />
                  </div>

                  <div className="flex-1">
                    <input
                      id="customer-name"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      required
                      placeholder="e.g. Rahul Sharma"
                      className="w-full h-11 rounded-xl border border-[#EBE4D8] bg-white px-3.5 text-xs text-[#29251F] placeholder:text-[#91885D]/60 focus:outline-none focus:ring-1 focus:ring-[#A03B2A]"
                    />
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label htmlFor="customer-email" className="text-[11px] font-bold text-[#696053] block mb-1">
                  Email Address <span className="text-[#A03B2A]">*</span>{" "}
                  <span className="text-[9.5px] font-normal text-[#7A6E5D]">(for digital receipt &amp; invoice)</span>
                </label>
                <div className="relative flex items-center">
                  <Mail className="h-4 w-4 text-[#7A6E5D] absolute left-3.5 pointer-events-none" />
                  <input
                    id="customer-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    required
                    placeholder="e.g. rahul@gmail.com"
                    className="w-full h-11 rounded-xl border border-[#EBE4D8] bg-white pl-10 pr-3.5 text-xs text-[#29251F] placeholder:text-[#91885D]/60 focus:outline-none focus:ring-1 focus:ring-[#A03B2A]"
                  />
                </div>
              </div>

              {/* Mobile Number with Country Code */}
              <div>
                <label htmlFor="customer-phone" className="text-[11px] font-bold text-[#696053] block mb-1">
                  Mobile Number <span className="text-[#A03B2A]">*</span>
                </label>
                <div className="flex gap-2.5">
                  <div className="relative flex items-center">
                    <div className="h-11 flex items-center justify-center pl-3 pr-6 rounded-xl border border-[#EBE4D8] bg-[#FDFBF7] text-xs font-bold text-[#696053] shrink-0">
                      <Phone className="h-3.5 w-3.5 mr-1 text-[#A03B2A]" />
                      <span>+91</span>
                    </div>
                    <ChevronDown className="h-3 w-3 text-[#7A6E5D] absolute right-2 pointer-events-none" />
                  </div>
                  <input
                    id="customer-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    required
                    maxLength={14}
                    placeholder="10-digit mobile number"
                    className="flex-1 h-11 rounded-xl border border-[#EBE4D8] bg-white px-3.5 text-xs text-[#29251F] placeholder:text-[#91885D]/60 focus:outline-none focus:ring-1 focus:ring-[#A03B2A]"
                  />
                </div>
              </div>

              {/* Add Alternate Phone Toggle */}
              {!showAlternatePhone ? (
                <button
                  type="button"
                  onClick={() => setShowAlternatePhone(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#A03B2A] hover:text-[#7A2E22] transition-colors cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Alternate Mobile No.</span>
                </button>
              ) : (
                <div className="pt-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#696053]">
                      Alternate Mobile Number (Optional)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAlternatePhone(false);
                        setAlternatePhone("");
                      }}
                      className="text-[10px] font-bold text-rose-700 hover:text-rose-900 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="tel"
                    value={alternatePhone}
                    onChange={(e) => handleAlternatePhoneChange(e.target.value)}
                    maxLength={14}
                    placeholder="Secondary mobile number"
                    className="w-full h-11 rounded-xl border border-[#EBE4D8] bg-white px-3.5 text-xs text-[#29251F] placeholder:text-[#91885D]/60 focus:outline-none focus:ring-1 focus:ring-[#A03B2A]"
                  />
                </div>
              )}
            </div>

            {/* 3. Delivery Address Card (Active when Delivery selected) */}
            {orderType === "delivery" && (
              <div id="delivery-address-card" className="bg-white border border-[#EBE4D8] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 animate-in fade-in">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FFF1EB] text-[#A03B2A] flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-serif font-bold text-base text-[#29251F] leading-tight">
                      Delivery Address
                    </h2>
                    <p className="text-xs text-[#7A6E5D] mt-0.5">
                      Where should we deliver your order?
                    </p>
                  </div>
                </div>

                {/* Flat, Building, Unit */}
                <div>
                  <label htmlFor="delivery-flat" className="text-[11px] font-bold text-[#696053] block mb-1">
                    Flat / House No. / Building{" "}
                    <span className="text-[9.5px] font-normal text-[#7A6E5D]">(Optional if in Street)</span>
                  </label>
                  <div className="relative flex items-center">
                    <Home className="h-4 w-4 text-[#7A6E5D] absolute left-3.5 pointer-events-none" />
                    <input
                      id="delivery-flat"
                      type="text"
                      value={flatBuilding}
                      onChange={(e) => {
                        setFlatBuilding(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      placeholder="e.g. Flat 402, Tower B, Palm Grove"
                      className="w-full h-11 rounded-xl border border-[#EBE4D8] bg-white pl-10 pr-3.5 text-xs text-[#29251F] placeholder:text-[#91885D]/60 focus:outline-none focus:ring-1 focus:ring-[#A03B2A]"
                    />
                  </div>
                </div>

                {/* Area, Street with Autocomplete */}
                <div className="relative" ref={suggestionsRef}>
                  <label htmlFor="delivery-area" className="text-[11px] font-bold text-[#696053] block mb-1">
                    Area / Street / Sector <span className="text-[#A03B2A]">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <MapPin className="h-4 w-4 text-[#A03B2A] absolute left-3.5 pointer-events-none" />
                    <input
                      id="delivery-area"
                      type="text"
                      value={areaStreet}
                      onChange={(e) => {
                        setAreaStreet(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      onFocus={() => {
                        if (suggestions.length > 0) setShowSuggestions(true);
                      }}
                      required
                      placeholder="e.g. DLF Cyber Hub, Sector 24"
                      className="w-full h-11 rounded-xl border border-[#EBE4D8] bg-white pl-10 pr-10 text-xs font-medium text-[#29251F] placeholder:text-[#91885D]/60 focus:outline-none focus:ring-1 focus:ring-[#A03B2A]"
                    />
                    <span className="absolute right-3.5 text-[#7A6E5D]">
                      {isSearchingSuggestions ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#A03B2A]" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </span>
                  </div>

                  {/* Suggestions Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-30 mt-1.5 max-h-56 overflow-y-auto rounded-2xl border border-[#E8DEC8] bg-white shadow-xl p-1.5 divide-y divide-[#E8DEC8]/50">
                      {suggestions.map((item, idx) => (
                        <button
                          key={`${item.title}-${idx}`}
                          type="button"
                          onClick={() => handleSelectSuggestion(item)}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-[#FAF7F2] transition-colors flex items-start gap-2.5 group cursor-pointer"
                        >
                          <MapPin className="h-3.5 w-3.5 text-[#A03B2A] shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-[#29251F] truncate group-hover:text-[#A03B2A]">
                              {item.title}
                            </p>
                            <p className="text-[10px] text-[#7A6E5D] truncate">
                              {item.subtitle}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Landmark (Optional) */}
                <div>
                  <label htmlFor="delivery-landmark" className="text-[11px] font-bold text-[#696053] block mb-1">
                    Landmark <span className="text-[9.5px] font-normal text-[#7A6E5D]">(Optional)</span>
                  </label>
                  <div className="relative flex items-center">
                    <Building2 className="h-4 w-4 text-[#7A6E5D] absolute left-3.5 pointer-events-none" />
                    <input
                      id="delivery-landmark"
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Near Metro Station / Behind Mall"
                      className="w-full h-11 rounded-xl border border-[#EBE4D8] bg-white pl-10 pr-3.5 text-xs text-[#29251F] placeholder:text-[#91885D]/60 focus:outline-none focus:ring-1 focus:ring-[#A03B2A]"
                    />
                  </div>
                </div>

                {/* Pincode + City Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="delivery-pincode" className="text-[11px] font-bold text-[#696053] block mb-1">
                      Pincode <span className="text-[#A03B2A]">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <MapPin className="h-4 w-4 text-[#A03B2A] absolute left-3.5 pointer-events-none" />
                      <input
                        id="delivery-pincode"
                        type="text"
                        value={pincode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setPincode(val);
                          if (errorMsg) setErrorMsg(null);
                          if (val.startsWith("201")) {
                            setCity("Noida");
                          } else if (val.startsWith("11") && city !== "Noida") {
                            setCity("Delhi");
                          } else if (val.startsWith("121") && city !== "Noida") {
                            setCity("Faridabad");
                          } else if (val.startsWith("122") && city !== "Noida") {
                            setCity("Gurugram");
                          }
                        }}
                        required
                        maxLength={6}
                        placeholder="6-digit pincode"
                        className="w-full h-11 rounded-xl border border-[#EBE4D8] bg-white pl-10 pr-3.5 text-xs font-bold text-[#29251F] placeholder:text-[#91885D]/60 focus:outline-none focus:ring-1 focus:ring-[#A03B2A]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="delivery-city" className="text-[11px] font-bold text-[#696053] block mb-1">
                      City <span className="text-[#A03B2A]">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <Building2 className="h-4 w-4 text-[#7A6E5D] absolute left-3.5 pointer-events-none" />
                      <select
                        id="delivery-city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full h-11 appearance-none rounded-xl border border-[#EBE4D8] bg-white pl-10 pr-8 text-xs font-bold text-[#29251F] focus:outline-none focus:ring-1 focus:ring-[#A03B2A] cursor-pointer"
                      >
                        <option value="Gurugram">Gurugram</option>
                        <option value="Noida">Noida</option>
                        <option value="Delhi">Delhi</option>
                        <option value="Faridabad">Faridabad</option>
                      </select>
                      <ChevronDown className="h-3.5 w-3.5 text-[#7A6E5D] absolute right-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Live Distance & Availability Notice */}
                {isCheckingDelivery ? (
                  <div className="flex items-center gap-2 text-xs text-[#7A6E5D] pt-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#A03B2A]" />
                    <span>Calculating road distance and delivery fee...</span>
                  </div>
                ) : isDeliveryChecked && !isDeliveryAvailable ? (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    {deliveryNotice || "Sorry, we currently deliver only within 50 km."}
                  </div>
                ) : isDeliveryChecked && isDeliveryAvailable && distanceKm !== null ? (
                  <div className="flex items-center justify-between text-xs text-[#29251F] pt-1">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
                      <span>📍</span>
                      <span>{distanceKm} km from bakery</span>
                    </span>
                    <span className="font-bold text-xs text-[#29251F]">
                      Delivery: {formatPrice(deliveryCharge || 0)}
                    </span>
                  </div>
                ) : null}
              </div>
            )}

            {/* 4. Delivery Schedule Card */}
            <div id="delivery-schedule-card" className="bg-white border border-[#EBE4D8] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FFF1EB] text-[#A03B2A] flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-serif font-bold text-base text-[#29251F] leading-tight">
                    Delivery Schedule
                  </h2>
                  <p className="text-xs text-[#7A6E5D] mt-0.5">
                    Select a date and time for delivery
                  </p>
                </div>
              </div>

              {/* Horizontal Scrollable Date Picker */}
              {loadingSlots ? (
                <div className="flex items-center gap-2 text-xs text-[#7A6E5D] py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-[#A03B2A]" />
                  <span>Loading available dates...</span>
                </div>
              ) : availableDates.length > 0 ? (
                <div className="flex gap-2.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                  {availableDates.map((dateStr) => {
                    const isSelected = selectedDate === dateStr;
                    const { dayName, dayNum, monthName } = getDateCardDetails(dateStr);
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => handleDateSelect(dateStr)}
                        className={`flex flex-col items-center justify-center min-w-[62px] py-3 px-2 rounded-2xl border transition-all cursor-pointer shrink-0 ${
                          isSelected
                            ? "bg-[#A03B2A] border-[#A03B2A] text-white shadow-xs"
                            : "bg-white border-[#EBE4D8] text-[#29251F] hover:border-[#A03B2A]/50"
                        }`}
                      >
                        <span
                          className={`text-[10px] font-medium leading-none ${
                            isSelected ? "text-white/80" : "text-[#7A6E5D]"
                          }`}
                        >
                          {dayName}
                        </span>
                        <span className="text-lg font-serif font-bold my-1 leading-none">
                          {dayNum}
                        </span>
                        <span
                          className={`text-[10px] font-medium leading-none ${
                            isSelected ? "text-white/80" : "text-[#7A6E5D]"
                          }`}
                        >
                          {monthName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#7A6E5D]">No dates available</p>
              )}

              {/* Delivery Timing Boxes */}
              <div className="space-y-2">
                {selectedDate && (slotsByDate[selectedDate] || []).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(slotsByDate[selectedDate] || []).map((slot) => {
                      const isSelected = selectedSlot?.id === slot.id;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? "border-[#A03B2A] bg-[#FFF8F5] shadow-xs"
                              : "border-[#EBE4D8] bg-white hover:border-[#A03B2A]/50 text-[#29251F]"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Clock
                              className={`h-4 w-4 shrink-0 ${
                                isSelected ? "text-[#A03B2A]" : "text-[#7A6E5D]"
                              }`}
                            />
                            <div className="min-w-0">
                              <p
                                className={`text-xs font-bold leading-tight truncate ${
                                  isSelected ? "text-[#A03B2A]" : "text-[#29251F]"
                                }`}
                              >
                                {formatSlotWindow(slot.start_time, slot.end_time)}
                              </p>
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block shrink-0" />
                                Available
                              </span>
                            </div>
                          </div>

                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-2 ${
                              isSelected ? "border-[#A03B2A]" : "border-[#91885D]/40"
                            }`}
                          >
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-[#A03B2A]" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl border border-dashed border-[#EBE4D8] text-center text-xs text-[#7A6E5D] bg-[#FBF9F5]">
                    {selectedDate
                      ? "No slots available for this date. Please select another date above."
                      : "Please select a delivery date first."}
                  </div>
                )}
              </div>

              {/* Freshly Baked Lead Time Notice (Matching uploaded photo) */}
              <div className="rounded-2xl border border-amber-200/70 bg-[#FFF9EE] p-3.5 flex items-start gap-3 text-xs shadow-2xs">
                <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 text-sm">
                  🧁
                </div>
                <div>
                  <p className="font-bold text-xs text-[#29251F] leading-tight">
                    Freshly made to order
                  </p>
                  <p className="text-[11px] text-[#7A6E5D] mt-0.5 leading-relaxed">
                    {cartBakingInfo && cartBakingInfo.maxHours > 0
                      ? `${items.length > 1 ? "These items are" : "This item is"} freshly made to order and will be ready for dispatch within ${formatBakingPeriod(
                          cartBakingInfo.maxHours
                        )}.`
                      : `${items.length > 1 ? "These items are" : "This item is"} freshly made to order and will be ready for dispatch shortly before delivery.`}
                  </p>
                </div>
              </div>

              {/* Sunday Sourdough Notice if applicable */}
              {hasSourdoughInCart && sourdoughSlotInfo && (
                <div className="rounded-2xl border border-[#A03B2A]/25 bg-[#FFF8F5] p-3 text-xs space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span>🥖</span>
                    <span className="font-bold text-[11px] text-[#29251F]">
                      Sunday Special Sourdough
                    </span>
                    <span className="ml-auto text-[9.5px] font-bold bg-[#A03B2A] text-white px-2 py-0.5 rounded-full">
                      Sundays Only
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[#7A6E5D]">
                    Freshly baked exclusively for Sunday orders after 36 hours of cold natural fermentation.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              RIGHT COLUMN: ORDER SUMMARY (Sticky Card matching reference photo)
              ═══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
            <div className="bg-white border border-[#EBE4D8] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              {/* Card Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#EBE4D8]/60">
                <h2 className="font-serif font-bold text-xl text-[#29251F] tracking-tight">
                  Order Summary
                </h2>
                <span className="bg-[#FAF5EC] text-[#7A6E5D] text-xs font-semibold px-2.5 py-1 rounded-full border border-[#EBE4D8]/70">
                  {totalItems} item{totalItems > 1 ? "s" : ""}
                </span>
              </div>

              {/* Scrollable Cart Item List with Images, Trash, and Steppers */}
              <div className="divide-y divide-[#EBE4D8]/50 max-h-[360px] overflow-y-auto pr-1 space-y-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.product.image_url ? (
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[#EBE4D8]">
                          <Image
                            src={item.product.image_url}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#F7EFE4] flex items-center justify-center shrink-0 text-lg">
                          🧁
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#29251F] truncate">
                          {item.product.name}
                        </p>
                        <p className="text-[10px] text-[#7A6E5D]">
                          Qty: {item.quantity}
                          {item.sizeLabel ? ` • ${item.sizeLabel}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-xs font-bold text-[#29251F]">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </span>

                      {/* Delete button + Stepper matching screenshot */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-[#D9534F] hover:text-[#C9302C] p-1 transition cursor-pointer"
                          aria-label="Remove Item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>

                        <div className="flex items-center border border-[#EBE4D8] rounded-lg bg-[#FAF7F2] text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => decrement(item.id)}
                            className="px-2 py-0.5 text-[#7A6E5D] hover:text-[#29251F] cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                          <span className="px-1.5 py-0.5 text-[11px] font-bold text-[#29251F]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => increment(item.id)}
                            className="px-2 py-0.5 text-[#7A6E5D] hover:text-[#29251F] cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-[#EBE4D8] pt-3.5 space-y-2 text-xs">
                <div className="flex justify-between text-[#7A6E5D]">
                  <span>Subtotal ({totalItems} items)</span>
                  <span className="font-semibold text-[#29251F]">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                {totalDiscountSavings > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Promotional Savings</span>
                    <span>-{formatPrice(totalDiscountSavings)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-[#7A6E5D]">
                  <span>Delivery fee</span>
                  <div>
                    {orderType === "takeaway" ? (
                      <span className="font-bold text-emerald-700">Free (₹0)</span>
                    ) : isCheckingDelivery ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#7A6E5D]">
                        <Loader2 className="h-3 w-3 animate-spin text-[#A03B2A]" />
                        <span>Calculating...</span>
                      </span>
                    ) : isDeliveryAvailable && deliveryCharge !== null ? (
                      <span className="font-bold text-[#29251F] flex items-center justify-end gap-1.5">
                        {distanceKm !== null && (
                          <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                            <span>📍</span>
                            <span>{distanceKm} km</span>
                          </span>
                        )}
                        <span>{formatPrice(deliveryCharge)}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#7A6E5D]">
                        Calculated at address
                      </span>
                    )}
                  </div>
                </div>

                {/* Surcharges if any */}
                {orderType === "delivery" && deliverySurges.length > 0 && (
                  <div className="text-[10px] text-amber-900 bg-amber-50/80 rounded-xl px-2.5 py-1.5 space-y-0.5 border border-amber-200">
                    {deliverySurges.map((s, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>• {s.name}</span>
                        <span className="font-semibold">+{formatPrice(s.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between text-[#7A6E5D]">
                  <span>Transaction Fee (4%)</span>
                  <span className="font-semibold text-[#29251F]">
                    +{formatPrice(packagingFee)}
                  </span>
                </div>

                {hasGiftNote && (
                  <div className="flex justify-between text-[#A03B2A] font-medium">
                    <span>Gift Note &amp; Ribbon</span>
                    <span>+{formatPrice(giftNoteFee)}</span>
                  </div>
                )}

                {/* Coupon Discount Row */}
                {appliedCoupon && discountAmount > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-800 bg-emerald-50/80 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-emerald-600" />
                      Coupon ({appliedCoupon.code} • {appliedCoupon.discountPercent}% OFF)
                    </span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
              </div>

              {/* Coupon Code Banner */}
              <div className="border-t border-[#EBE4D8] pt-3">
                {appliedCoupon && discountAmount > 0 ? (
                  <div className="p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-extrabold text-xs text-emerald-950 uppercase tracking-wider">
                            {appliedCoupon.code}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                            {appliedCoupon.discountPercent}% OFF
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800 mt-0.5 font-medium">
                          You saved {formatPrice(discountAmount)} on this order!
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-xs font-bold text-rose-700 hover:text-rose-900 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : !showCouponInput ? (
                  <button
                    type="button"
                    onClick={() => setShowCouponInput(true)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#FFF8F5] border border-[#A03B2A]/20 hover:border-[#A03B2A]/40 transition text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Gift className="h-4 w-4 text-[#A03B2A]" />
                      <span className="text-xs font-bold text-[#A03B2A]">
                        Have a coupon code?
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#A03B2A]" />
                  </button>
                ) : (
                  <div className="rounded-2xl border border-[#EBE4D8] bg-white p-3 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#29251F]">
                        <Tag className="w-3.5 h-3.5 text-[#A03B2A]" />
                        <span>Enter Coupon Code</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCouponInput(false);
                          setCouponMessage(null);
                        }}
                        className="text-[#7A6E5D] hover:text-[#29251F] p-0.5 rounded cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleApplyCoupon} className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                          placeholder="e.g. WELCOME10"
                          className="flex-1 h-10 rounded-xl border border-[#EBE4D8] bg-[#FAF7F2] px-3 font-mono text-xs uppercase font-bold text-[#29251F] focus:outline-none focus:ring-2 focus:ring-[#A03B2A]/30 focus:border-[#A03B2A]"
                        />
                        <button
                          type="submit"
                          disabled={validatingCoupon || !couponCode.trim()}
                          className="px-4 h-10 rounded-xl bg-[#394231] text-white text-xs font-bold hover:bg-[#2C3426] transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                        >
                          {validatingCoupon ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Applying...</span>
                            </>
                          ) : (
                            <span>Apply</span>
                          )}
                        </button>
                      </div>

                      {couponMessage && (
                        <div
                          className={`flex items-start gap-2 p-2.5 rounded-xl text-[11px] leading-relaxed font-semibold ${
                            couponMessage.type === "success"
                              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                              : "bg-rose-50 text-rose-900 border border-rose-200"
                          }`}
                        >
                          {couponMessage.type === "success" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                          )}
                          <span>{couponMessage.text}</span>
                        </div>
                      )}
                    </form>
                  </div>
                )}
              </div>

              {/* Total Amount Box */}
              <div className="border-t border-[#EBE4D8] pt-3.5 flex justify-between items-baseline">
                <div>
                  <h3 className="font-serif text-base font-bold text-[#29251F] leading-tight">
                    Total Amount
                  </h3>
                  <p className="text-[10px] text-[#7A6E5D]">Inclusive of all taxes</p>
                </div>
                <span className="font-serif text-3xl font-extrabold text-[#29251F]">
                  {formatPrice(total)}
                </span>
              </div>

              {/* Trust Badges (Matching uploaded photo) */}
              <div className="border-t border-[#EBE4D8] pt-4 grid grid-cols-3 gap-2 text-center">
                <div className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-[#FBF9F5] border border-[#EBE4D8]/60">
                  <div className="w-7 h-7 rounded-full bg-emerald-100/70 text-emerald-800 flex items-center justify-center">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#29251F] leading-tight">
                      Secure Payments
                    </p>
                    <p className="text-[9px] text-[#7A6E5D] mt-0.5 leading-none">
                      Powered by Razorpay
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-[#FBF9F5] border border-[#EBE4D8]/60">
                  <div className="w-7 h-7 rounded-full bg-amber-100/70 text-amber-800 flex items-center justify-center">
                    <ChefHat className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#29251F] leading-tight">
                      Freshly Baked
                    </p>
                    <p className="text-[9px] text-[#7A6E5D] mt-0.5 leading-none">
                      Prepared on order
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-[#FBF9F5] border border-[#EBE4D8]/60">
                  <div className="w-7 h-7 rounded-full bg-emerald-100/70 text-emerald-800 flex items-center justify-center">
                    <Leaf className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#29251F] leading-tight">
                      Quality You Can Trust
                    </p>
                    <p className="text-[9px] text-[#7A6E5D] mt-0.5 leading-none">
                      Premium ingredients
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── FLOATING ERROR TOAST NOTIFICATION ── */}
      {errorMsg && (
        <aside aria-label="Error Notification" className="fixed bottom-20 sm:bottom-22 left-4 right-4 max-w-md mx-auto z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="bg-[#8B261D] text-white text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border border-red-400/30 backdrop-blur-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className="h-4 w-4 text-red-200 shrink-0" />
              <p className="font-semibold text-[11.5px] leading-snug">
                {errorMsg}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              aria-label="Dismiss error"
              className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white shrink-0 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </aside>
      )}

      {/* ── FIXED BOTTOM CHECKOUT BAR (Mobile Optimized & Sleek) ── */}
      <aside aria-label="Order Checkout Bar" className="fixed bottom-2.5 sm:bottom-4 left-2.5 sm:left-4 right-2.5 sm:right-4 max-w-4xl mx-auto z-40">
        <div className="bg-[#1C2C20]/95 sm:bg-[#1C2C20] text-white rounded-2xl sm:rounded-full px-3.5 sm:px-6 py-2 sm:py-3 shadow-xl sm:shadow-2xl flex items-center justify-between gap-2.5 sm:gap-4 border border-white/10 sm:border-emerald-950/40 backdrop-blur-md">
          {/* Left: Total Amount */}
          <div className="min-w-0 shrink-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[9px] uppercase font-bold text-white/70 tracking-wider">
                Total
              </span>
              <span className="font-serif text-lg sm:text-2xl font-black text-white leading-tight">
                {formatPrice(total)}
              </span>
            </div>
            <span className="text-[9px] text-white/60 block leading-none truncate">
              Incl. all taxes
            </span>
          </div>

          {/* Vertical Separator */}
          <div className="h-7 w-px bg-white/20 hidden sm:block shrink-0" />

          {/* Right: Pay Now Button with Lock & Circular Arrow */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={submitting}
            className="flex-1 sm:flex-initial flex items-center justify-between sm:justify-start gap-2 sm:gap-3 rounded-full bg-[#293B2D] hover:bg-[#344D3A] active:bg-[#1E2D21] active:scale-[0.98] border border-white/10 px-3 sm:px-5 py-1.5 sm:py-2.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer group shadow-inner min-h-[42px] sm:min-h-0"
          >
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-white/90 shrink-0" />
              <div className="text-left">
                <p className="text-xs sm:text-sm font-bold text-white leading-tight flex items-center gap-1.5">
                  <span>{submitting ? "Opening Gateway..." : "Pay Now"}</span>
                  <span className="hidden sm:inline text-[11px] text-white/80 font-normal">
                    (Razorpay)
                  </span>
                </p>
                <p className="text-[9px] text-white/70 leading-none hidden min-[360px]:block">
                  UPI, Cards &amp; more
                </p>
              </div>
            </div>

            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white text-[#1C2C20] flex items-center justify-center shrink-0 group-hover:translate-x-0.5 transition-transform shadow-sm">
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin text-[#1C2C20]" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#1C2C20]" />
              )}
            </div>
          </button>
        </div>
      </aside>

      {/* ── DIGITAL RECEIPT / PAYMENT TRANSITION MODAL ── */}
      {isGeneratingReceipt && (
        <div className="fixed inset-0 z-[9999] bg-[#29251F]/80 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#FAF7F2] border border-[#E8DEC8] rounded-3xl p-7 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
            <div className="relative mx-auto w-16 h-16 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-[#FAF7F2] border-2 border-[#91885D]/30 flex items-center justify-center text-[#9C4133] shadow-inner relative">
                <Sparkles className="w-8 h-8 text-[#9C4133] animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#394231] text-white flex items-center justify-center shadow-md animate-bounce">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-bold tracking-wide uppercase mb-2 border border-emerald-200">
              Payment Successful
            </div>

            <h3 className="font-serif text-xl font-bold text-[#29251F] leading-tight mb-1.5">
              Generating Your Receipt...
            </h3>
            <p className="text-xs text-[#7A6E5D] leading-relaxed mb-4">
              Please wait while we secure your baking slot and prepare your digital invoice.
            </p>

            <div className="space-y-2 text-left bg-white rounded-2xl p-3 border border-[#E8DEC8] text-xs">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                <span className="w-3.5 h-3.5 rounded-full bg-[#394231] text-white flex items-center justify-center text-[9px] shrink-0 font-bold">
                  ✓
                </span>
                <span>Payment verified securely</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                <span className="w-3.5 h-3.5 rounded-full bg-[#394231] text-white flex items-center justify-center text-[9px] shrink-0 font-bold">
                  ✓
                </span>
                <span>Baking slot confirmed</span>
              </div>
              <div className="flex items-center gap-2 text-[#9C4133] font-bold animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-[#9C4133]" />
                <span>Generating receipt &amp; order details...</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
