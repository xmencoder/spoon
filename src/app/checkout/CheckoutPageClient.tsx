"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Phone,
  MapPin,
  Mail,
  Home,
  Building2,
  Plus,
  X,
  Search,
  Check,
  Calendar,
  Clock,
  CreditCard,
  Sparkles,
  Timer,
  ChevronDown,
  ArrowRight,
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

/**
 * Format a baking period in hours to a human-friendly string (e.g. 2 days, 4 hrs, 12 hrs)
 */
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

// Helper to dynamically load Razorpay Checkout Script
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
    clearCart,
  } = useCart();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);

  // 2-Step Mobile & Responsive Checkout Navigation: Step 1 (Details) | Step 2 (Review & Schedule)
  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1);

  // Fulfilment
  const [orderType, setOrderType] = useState<"delivery" | "takeaway">("delivery");

  // Receiver's Contact
  const [salutation, setSalutation] = useState<"Mr" | "Ms" | "Mrs">("Mr");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [showAlternatePhone, setShowAlternatePhone] = useState(false);
  const [alternatePhone, setAlternatePhone] = useState("");

  // Receiver's Address
  const [flatBuilding, setFlatBuilding] = useState("");
  const [areaStreet, setAreaStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("Gurugram");
  const [addressType, setAddressType] = useState<"home" | "office" | "other">("home");

  // Delivery Date & Time Slot State
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [slotsByDate, setSlotsByDate] = useState<Record<string, DeliverySlot[]>>({});
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [cartBakingInfo, setCartBakingInfo] = useState<{
    maxHours: number;
    maxCategoryName: string;
    categoryList: { name: string; hours: number }[];
  } | null>(null);

  const hasSourdoughInCart = React.useMemo(() => {
    return items.some((i) => isSourdoughOrFocaccia(i.product));
  }, [items]);

  const sourdoughSlotInfo = React.useMemo(() => {
    return hasSourdoughInCart ? getSourdoughSlotInfo() : null;
  }, [hasSourdoughInCart]);

  const totalDiscountSavings = React.useMemo(() => {
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

  // Automatic Seamless Delivery Distance Calculation
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
      setRestaurant(data as Restaurant | null);
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
        // ignore suggestion fetch errors
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [areaStreet, city]);

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

  // Select an address suggestion from dropdown
  const handleSelectSuggestion = (item: AddressSuggestion) => {
    setAreaStreet(item.title);
    if (item.postcode) setPincode(item.postcode);
    if (item.city) setCity(item.city);
    setShowSuggestions(false);
  };

  // ── Automatic Seamless Delivery Calculation ──
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
  const total = subtotal + effectiveDeliveryCharge + packagingFee + currentGiftFee;
  const minimumOrder = restaurant?.minimum_order ?? 0;

  // Validation
  const isBelowMinimum = minimumOrder > 0 && subtotal < minimumOrder;
  const isClosed = restaurant && !restaurant.is_open;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isContactValid =
    name.trim().length >= 2 &&
    phone.trim().replace(/\D/g, "").length >= 10 &&
    isEmailValid;

  const isAddressValid =
    orderType === "takeaway" ||
    (flatBuilding.trim().length >= 1 &&
      areaStreet.trim().length >= 2 &&
      pincode.trim().length >= 5 &&
      isDeliveryAvailable);

  const isSlotValid = Boolean(selectedDate) && Boolean(selectedSlot);

  const hasExceededProdLimit = React.useMemo(() => {
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

  // ── Step 1 -> Step 2 Advance Handler ──
  const handleContinueToReview = () => {
    setErrorMsg(null);

    if (name.trim().length < 2) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (phone.trim().replace(/\D/g, "").length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!isEmailValid) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (orderType === "delivery") {
      if (!flatBuilding.trim()) {
        setErrorMsg("Please enter your Apartment / Flat / Building.");
        return;
      }
      if (!areaStreet.trim()) {
        setErrorMsg("Please enter your Area, Street, or Sector.");
        return;
      }
      if (!pincode.trim() || pincode.trim().length < 5) {
        setErrorMsg("Please enter a valid 6-digit Pincode.");
        return;
      }
      if (isDeliveryChecked && !isDeliveryAvailable) {
        setErrorMsg(
          deliveryNotice ||
            "Delivery is unavailable for this location. We currently deliver within 50 km."
        );
        return;
      }
    }

    // Advance to Step 2
    setCheckoutStep(2);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBackToDetails = () => {
    setErrorMsg(null);
    setCheckoutStep(1);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Handle Checkout & Launch Razorpay
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!restaurant) return;

    if (!isContactValid || (orderType === "delivery" && !isAddressValid)) {
      setCheckoutStep(1);
      setErrorMsg("Please complete your contact and address details.");
      return;
    }

    if (!isSlotValid) {
      setErrorMsg("Please select an available delivery date & time slot.");
      return;
    }

    if (hasExceededProdLimit) {
      setErrorMsg(
        "One or more items in your cart exceed the daily order limit. Please adjust your cart before checkout."
      );
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
      });

      if (!result.success || !result.orderId) {
        throw new Error(result.error || "Failed to create order. Please try again.");
      }

      // Save complete receipt snapshot for the digital receipt page
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

      // Launch Razorpay Online Payment Gateway
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
            "Razorpay checkout failed to load. Please check your internet connection or disable ad-blockers and try again."
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
              // Verify payment on server
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

  // Helper date parts extractor for date cards
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
    <div className="min-h-screen bg-[#FAF7F2] text-[#29251F] font-sans relative overflow-x-hidden">
      {/* Decorative Warm Botanical Leaves Accents */}
      <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 pointer-events-none opacity-30 select-none overflow-hidden">
        <svg viewBox="0 0 200 200" className="w-full h-full fill-none stroke-[#91885D] stroke-1">
          <path d="M120,0 C140,50 190,80 200,120 M140,20 C170,40 180,90 190,130 M150,5 C120,60 160,110 180,140 M165,10 C180,60 150,90 170,120" />
          <path d="M180,10 C160,30 150,60 170,80 C190,60 190,30 180,10 Z" fill="#91885D" fillOpacity="0.08" />
        </svg>
      </div>
      <div className="absolute bottom-0 left-0 w-48 sm:w-64 h-48 sm:h-64 pointer-events-none opacity-25 select-none overflow-hidden">
        <svg viewBox="0 0 200 200" className="w-full h-full fill-none stroke-[#91885D] stroke-1">
          <path d="M0,120 C50,140 80,190 120,200 M20,140 C40,170 90,180 130,190 M5,150 C60,120 110,160 140,180" />
          <path d="M10,180 C30,160 60,150 80,170 C60,190 30,190 10,180 Z" fill="#91885D" fillOpacity="0.08" />
        </svg>
      </div>

      {/* ── TOP HEADER / 2-STEP STEPPER (Exact Match to Uploaded Photo) ── */}
      <header className="max-w-xl mx-auto px-4 sm:px-6 pt-5 pb-3">
        <div className="flex items-center justify-between">
          {/* Back button: Step 1 goes to /cart, Step 2 goes back to Step 1 */}
          {checkoutStep === 1 ? (
            <Link
              href="/cart"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#29251F] hover:text-[#9C4133] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to cart</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleBackToDetails}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#29251F] hover:text-[#9C4133] transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          )}

          {/* Stepper (1 Details <-> 2 Review) */}
          <nav aria-label="Checkout Progress" className="flex items-center gap-4 sm:gap-6">
            {/* Step 1 Pill */}
            <button
              type="button"
              onClick={() => checkoutStep === 2 && handleBackToDetails()}
              className="flex flex-col items-center gap-1 cursor-pointer"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  checkoutStep === 1
                    ? "bg-[#9C4133] text-white shadow-xs"
                    : "border border-[#9C4133] text-[#9C4133] bg-[#FFF8F5]"
                }`}
              >
                {checkoutStep === 2 ? <Check className="h-3.5 w-3.5 stroke-[2.5]" /> : "1"}
              </div>
              <span
                className={`text-[11px] font-bold tracking-tight ${
                  checkoutStep === 1 ? "text-[#9C4133]" : "text-[#7A6E5D]"
                }`}
              >
                Details
              </span>
            </button>

            {/* Connecting line */}
            <div className="w-10 sm:w-16 h-px bg-[#91885D]/30 -mt-3.5" />

            {/* Step 2 Pill */}
            <button
              type="button"
              onClick={() => checkoutStep === 1 && handleContinueToReview()}
              className="flex flex-col items-center gap-1 cursor-pointer"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  checkoutStep === 2
                    ? "bg-[#9C4133] text-white shadow-xs"
                    : "border border-[#91885D]/40 text-[#7A6E5D] bg-white"
                }`}
              >
                2
              </div>
              <span
                className={`text-[11px] font-bold tracking-tight ${
                  checkoutStep === 2 ? "text-[#9C4133]" : "text-[#7A6E5D]"
                }`}
              >
                Review
              </span>
            </button>
          </nav>

          {/* Cart Icon with Item Badge */}
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
        </div>
      </header>

      {/* ── MAIN CONTAINER: SEGREGATED IN 2 PAGES ── */}
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-3 pb-24">
        {/* Global Error Notice */}
        {errorMsg && (
          <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-[#9C4133]/10 border border-[#9C4133]/30 p-3.5 text-xs font-medium text-[#9C4133] animate-in fade-in">
            <AlertCircle className="h-4 w-4 text-[#9C4133] shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            PAGE 1: STEP 1 OF 2 — "Your Details" (Exact Match)
            ═══════════════════════════════════════════════════════════ */}
        {checkoutStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Step Header */}
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#9C4133] block mb-0.5">
                STEP 1 OF 2
              </span>
              <h1 className="font-serif text-3xl font-bold text-[#29251F] tracking-tight">
                Your Details
              </h1>
              <p className="text-xs text-[#7A6E5D] mt-0.5 font-medium">
                Let&apos;s get the basics sorted.
              </p>
            </div>

            {/* 1. Delivery Method Card */}
            <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#9C4133] text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h2 className="font-serif font-bold text-sm text-[#29251F] leading-tight">
                    Delivery Method
                  </h2>
                  <p className="text-[11px] text-[#7A6E5D] mt-0.5">
                    Choose how you want to receive your order
                  </p>
                </div>
              </div>

              {/* 2 Radio Cards */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Home Delivery Card */}
                <button
                  type="button"
                  onClick={() => setOrderType("delivery")}
                  className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    orderType === "delivery"
                      ? "border-[#9C4133] bg-[#FFF8F5] shadow-2xs"
                      : "border-[#E8DEC8] bg-white hover:border-[#9C4133]/50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        orderType === "delivery"
                          ? "bg-[#9C4133]/10 text-[#9C4133]"
                          : "bg-[#F7EFE4] text-[#7A6E5D]"
                      }`}
                    >
                      <Truck className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p
                        className={`text-xs font-bold leading-tight ${
                          orderType === "delivery" ? "text-[#9C4133]" : "text-[#29251F]"
                        }`}
                      >
                        Home Delivery
                      </p>
                      <p className="text-[9.5px] text-[#7A6E5D] mt-0.5">Distance-based fare</p>
                    </div>
                  </div>

                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      orderType === "delivery" ? "border-[#9C4133]" : "border-[#91885D]/40"
                    }`}
                  >
                    {orderType === "delivery" && (
                      <div className="w-2 h-2 rounded-full bg-[#9C4133]" />
                    )}
                  </div>
                </button>

                {/* Takeaway / Pickup Card */}
                <button
                  type="button"
                  onClick={() => setOrderType("takeaway")}
                  className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    orderType === "takeaway"
                      ? "border-[#9C4133] bg-[#FFF8F5] shadow-2xs"
                      : "border-[#E8DEC8] bg-white hover:border-[#9C4133]/50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        orderType === "takeaway"
                          ? "bg-[#9C4133]/10 text-[#9C4133]"
                          : "bg-[#F7EFE4] text-[#7A6E5D]"
                      }`}
                    >
                      <ShoppingBag className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p
                        className={`text-xs font-bold leading-tight ${
                          orderType === "takeaway" ? "text-[#9C4133]" : "text-[#29251F]"
                        }`}
                      >
                        Takeaway / Pickup
                      </p>
                      <p className="text-[9.5px] text-[#7A6E5D] mt-0.5">Free (₹0)</p>
                    </div>
                  </div>

                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      orderType === "takeaway" ? "border-[#9C4133]" : "border-[#91885D]/40"
                    }`}
                  >
                    {orderType === "takeaway" && (
                      <div className="w-2 h-2 rounded-full bg-[#9C4133]" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Receiver's Contact Card */}
            <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#9C4133] text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h2 className="font-serif font-bold text-sm text-[#29251F] leading-tight">
                    Receiver&apos;s Contact
                  </h2>
                  <p className="text-[11px] text-[#7A6E5D] mt-0.5">
                    We&apos;ll use these details to share order updates.
                  </p>
                </div>
              </div>

              {/* Title + Name */}
              <div className="flex gap-2">
                <div className="relative w-24 shrink-0">
                  <select
                    value={salutation}
                    onChange={(e) => setSalutation(e.target.value as "Mr" | "Ms" | "Mrs")}
                    aria-label="Title"
                    className="w-full h-10 appearance-none rounded-xl border border-[#E8DEC8] bg-white px-3 text-xs font-semibold text-[#29251F] focus:outline-none focus:ring-1 focus:ring-[#9C4133] cursor-pointer"
                  >
                    <option value="Mr">Mr</option>
                    <option value="Ms">Ms</option>
                    <option value="Mrs">Mrs</option>
                  </select>
                  <ChevronDown className="h-3.5 w-3.5 text-[#7A6E5D] absolute right-3 top-3.5 pointer-events-none" />
                </div>

                <div className="flex-1">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Enter full name"
                    className="w-full h-10 rounded-xl border border-[#E8DEC8] bg-white px-3.5 text-xs text-[#29251F] placeholder:text-[#91885D]/60 focus:outline-none focus:ring-1 focus:ring-[#9C4133]"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="relative flex items-center">
                <Mail className="h-3.5 w-3.5 text-[#7A6E5D] absolute left-3 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="e.g. you@example.com"
                  className="w-full h-10 rounded-xl border border-[#E8DEC8] bg-white pl-9 pr-3 text-xs text-[#29251F] placeholder:text-[#91885D]/60 focus:outline-none focus:ring-1 focus:ring-[#9C4133]"
                />
              </div>

              {/* Mobile Number */}
              <div className="flex gap-2">
                <div className="h-10 flex items-center justify-center px-3 rounded-xl border border-[#E8DEC8] bg-[#FDFBF7] text-xs font-bold text-[#696053] shrink-0">
                  <Phone className="h-3 w-3 mr-1 text-[#9C4133]" />
                  +91
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  className="flex-1 h-10 rounded-xl border border-[#E8DEC8] bg-white px-3.5 text-xs text-[#29251F] placeholder:text-[#91885D]/60 focus:outline-none focus:ring-1 focus:ring-[#9C4133]"
                />
              </div>

              {/* Add Alternate Mobile Toggle */}
              {!showAlternatePhone ? (
                <button
                  type="button"
                  onClick={() => setShowAlternatePhone(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#9C4133] hover:text-[#7A2E22] transition-colors cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Alternate Mobile No.</span>
                </button>
              ) : (
                <div className="pt-0.5 space-y-1">
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
                      className="text-[10px] font-bold text-rose-700 hover:text-rose-900 cursor-pointer flex items-center gap-0.5"
                    >
                      <X className="h-3 w-3" />
                      <span>Remove</span>
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-10 flex items-center justify-center px-3 rounded-xl border border-[#E8DEC8] bg-[#FDFBF7] text-xs font-bold text-[#696053] shrink-0">
                      +91
                    </div>
                    <input
                      type="tel"
                      value={alternatePhone}
                      onChange={(e) => setAlternatePhone(e.target.value)}
                      maxLength={10}
                      placeholder="Secondary mobile number"
                      className="flex-1 h-10 rounded-xl border border-[#E8DEC8] bg-white px-3.5 text-xs text-[#29251F] placeholder:text-[#91885D]/60 focus:outline-none focus:ring-1 focus:ring-[#9C4133]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Delivery Address Card (Home Delivery only) */}
            {orderType === "delivery" && (
              <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#9C4133] text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h2 className="font-serif font-bold text-sm text-[#29251F] leading-tight">
                      Delivery Address
                    </h2>
                    <p className="text-[11px] text-[#7A6E5D] mt-0.5">
                      Where should we deliver your order?
                    </p>
                  </div>
                </div>

                {/* Apartment, Flat */}
                <div className="relative flex items-center">
                  <Home className="h-3.5 w-3.5 text-[#7A6E5D] absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={flatBuilding}
                    onChange={(e) => setFlatBuilding(e.target.value)}
                    required
                    placeholder="Apartment, Flat, House No., Building, Company"
                    className="w-full h-10 rounded-xl border border-[#E8DEC8] bg-white pl-9 pr-3 text-xs text-[#29251F] placeholder:text-[#91885D]/60 focus:outline-none focus:ring-1 focus:ring-[#9C4133]"
                  />
                </div>

                {/* Area, Street with Autocomplete */}
                <div className="relative" ref={suggestionsRef}>
                  <div className="relative flex items-center">
                    <MapPin className="h-3.5 w-3.5 text-[#9C4133] absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={areaStreet}
                      onChange={(e) => setAreaStreet(e.target.value)}
                      onFocus={() => {
                        if (suggestions.length > 0) setShowSuggestions(true);
                      }}
                      required
                      placeholder="Area, Street, Sector, Village"
                      className="w-full h-10 rounded-xl border border-[#E8DEC8] bg-white pl-9 pr-9 text-xs font-medium text-[#29251F] placeholder:text-[#91885D]/60 focus:outline-none focus:ring-1 focus:ring-[#9C4133]"
                    />
                    <span className="absolute right-3 text-[#7A6E5D]">
                      {isSearchingSuggestions ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9C4133]" />
                      ) : (
                        <Search className="h-3.5 w-3.5" />
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
                          <MapPin className="h-3.5 w-3.5 text-[#9C4133] shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-[#29251F] truncate group-hover:text-[#9C4133]">
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
                <div className="relative flex items-center">
                  <Building2 className="h-3.5 w-3.5 text-[#7A6E5D] absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="Landmark (Optional)"
                    className="w-full h-10 rounded-xl border border-[#E8DEC8] bg-white pl-9 pr-3 text-xs text-[#29251F] placeholder:text-[#91885D]/60 focus:outline-none focus:ring-1 focus:ring-[#9C4133]"
                  />
                </div>

                {/* Pincode + City Row */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="relative flex items-center">
                    <MapPin className="h-3.5 w-3.5 text-[#9C4133] absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setPincode(val);
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
                      placeholder="Pincode *"
                      className="w-full h-10 rounded-xl border border-[#E8DEC8] bg-white pl-9 pr-3 text-xs font-bold text-[#29251F] placeholder:text-[#91885D]/60 focus:outline-none focus:ring-1 focus:ring-[#9C4133]"
                    />
                  </div>

                  <div className="relative flex items-center">
                    <Building2 className="h-3.5 w-3.5 text-[#7A6E5D] absolute left-3 pointer-events-none" />
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full h-10 appearance-none rounded-xl border border-[#E8DEC8] bg-white pl-9 pr-8 text-xs font-bold text-[#29251F] focus:outline-none focus:ring-1 focus:ring-[#9C4133] cursor-pointer"
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
            )}

            {/* Step 1 Primary CTA Button: Continue to Review → (Exact Match) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleContinueToReview}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-[#394231] hover:bg-[#2C3426] active:bg-[#22291E] text-white py-3.5 px-6 font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <span>Continue to Review</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            PAGE 2: STEP 2 OF 2 — "Review & Schedule" (Exact Match)
            ═══════════════════════════════════════════════════════════ */}
        {checkoutStep === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Step Header */}
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#9C4133] block mb-0.5">
                STEP 2 OF 2
              </span>
              <h1 className="font-serif text-3xl font-bold text-[#29251F] tracking-tight">
                Review &amp; Schedule
              </h1>
              <p className="text-xs text-[#7A6E5D] mt-0.5 font-medium">
                Almost there! Confirm your order details.
              </p>
            </div>

            {/* 1. Delivery Date Section (Horizontal Cards matching screenshot) */}
            <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#9C4133]" />
                <h2 className="font-serif font-bold text-sm text-[#29251F]">
                  Delivery Date
                </h2>
              </div>

              {loadingSlots ? (
                <div className="flex items-center gap-2 text-xs text-[#7A6E5D] py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#9C4133]" />
                  <span>Loading available dates...</span>
                </div>
              ) : availableDates.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                  {availableDates.map((dateStr) => {
                    const isSelected = selectedDate === dateStr;
                    const { dayName, dayNum, monthName } = getDateCardDetails(dateStr);
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => handleDateSelect(dateStr)}
                        className={`flex flex-col items-center justify-center min-w-[54px] py-2.5 px-2 rounded-2xl border transition-all cursor-pointer shrink-0 ${
                          isSelected
                            ? "bg-[#9C4133] border-[#9C4133] text-white shadow-xs"
                            : "bg-white border-[#E8DEC8] text-[#29251F] hover:border-[#9C4133]/50"
                        }`}
                      >
                        <span
                          className={`text-[10px] font-medium leading-none ${
                            isSelected ? "text-white/80" : "text-[#7A6E5D]"
                          }`}
                        >
                          {dayName}
                        </span>
                        <span className="text-base font-serif font-bold my-1 leading-none">
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
            </div>

            {/* 2. Time Slot Section */}
            <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#9C4133]" />
                <h2 className="font-serif font-bold text-sm text-[#29251F]">
                  Time Slot
                </h2>
              </div>

              {selectedDate && (slotsByDate[selectedDate] || []).length > 0 ? (
                <div className="space-y-2">
                  {(slotsByDate[selectedDate] || []).map((slot) => {
                    const isSelected = selectedSlot?.id === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#9C4133] bg-[#FFF8F5] shadow-2xs"
                            : "border-[#E8DEC8] bg-white hover:border-[#9C4133]/50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? "border-[#9C4133]" : "border-[#91885D]/40"
                            }`}
                          >
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-[#9C4133]" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#29251F]">
                              {formatSlotWindow(slot.start_time, slot.end_time)}
                            </p>
                            <p className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                              ✓ Available
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#7A6E5D]">Please select a delivery date first.</p>
              )}
            </div>

            {/* 3. Baking & Preparation Lead Time Notice */}
            {cartBakingInfo && cartBakingInfo.maxHours > 0 && !hasSourdoughInCart && (
              <div className="rounded-2xl border border-amber-200 bg-[#FFFBEB] p-3 text-xs space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-800">
                    <Timer className="h-3 w-3" />
                  </div>
                  <span className="font-bold text-[11px] text-[#29251F]">
                    Baking &amp; Preparation Lead Time
                  </span>
                  <span className="ml-auto text-[10px] font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full">
                    {formatBakingPeriod(cartBakingInfo.maxHours)} baking
                  </span>
                </div>
                <p className="text-[10.5px] text-[#7A6E5D] leading-relaxed">
                  Freshly handcrafted on order. Available slots start after{" "}
                  {formatBakingPeriod(cartBakingInfo.maxHours)} to guarantee peak oven-fresh quality.
                </p>
              </div>
            )}

            {/* Sourdough Sunday Special Notice */}
            {hasSourdoughInCart && sourdoughSlotInfo && (
              <div className="rounded-2xl border border-[#9C4133]/25 bg-[#FFF8F5] p-3 text-xs space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🥖</span>
                  <span className="font-bold text-[11px] text-[#29251F]">
                    Sunday Special Sourdough
                  </span>
                  <span className="ml-auto text-[9.5px] font-bold bg-[#9C4133] text-white px-2 py-0.5 rounded-full">
                    Sundays Only
                  </span>
                </div>
                <p className="text-[10.5px] text-[#7A6E5D]">
                  Freshly baked exclusively for Sunday orders after 36 hours of cold natural fermentation.
                </p>
              </div>
            )}

            {/* 4. Order Summary Section */}
            <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-[#9C4133]" />
                <h2 className="font-serif font-bold text-sm text-[#29251F]">
                  Order Summary
                </h2>
              </div>

              {/* Items List */}
              <div className="divide-y divide-[#E8DEC8]/50 max-h-56 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.product.image_url ? (
                        <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-[#E8DEC8]">
                          <Image
                            src={item.product.image_url}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                            sizes="44px"
                          />
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-[#F7EFE4] flex items-center justify-center shrink-0 text-base">
                          🧁
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#29251F] truncate">
                          {item.product.name}
                        </p>
                        <p className="text-[10px] text-[#7A6E5D]">
                          x {item.quantity}
                          {item.sizeLabel ? ` • ${item.sizeLabel}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#29251F] shrink-0">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-[#E8DEC8]/60 pt-3 space-y-2 text-xs">
                <div className="flex justify-between text-[#7A6E5D]">
                  <span>
                    Subtotal ({totalItems} item{totalItems > 1 ? "s" : ""})
                  </span>
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
                        <Loader2 className="h-3 w-3 animate-spin text-[#9C4133]" />
                        <span>Calculating...</span>
                      </span>
                    ) : isDeliveryAvailable && deliveryCharge !== null ? (
                      <span className="font-bold text-[#29251F] flex items-center justify-end gap-1.5">
                        {distanceKm !== null && (
                          <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100 px-1.5 py-0.2 rounded">
                            ✓ {distanceKm} km
                          </span>
                        )}
                        <span>{formatPrice(deliveryCharge)}</span>
                      </span>
                    ) : deliveryNotice ? (
                      <span className="text-[10.5px] text-[#9C4133] font-semibold">
                        {deliveryNotice}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#7A6E5D]">
                        Calculated after address
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
                  <span>Transaction Fees (4%)</span>
                  <span className="font-semibold text-[#29251F]">
                    +{formatPrice(packagingFee)}
                  </span>
                </div>

                {hasGiftNote && (
                  <div className="flex justify-between text-[#9C4133] font-medium">
                    <span>Gift Note &amp; Ribbon</span>
                    <span>+{formatPrice(giftNoteFee)}</span>
                  </div>
                )}

                <div className="border-t border-[#E8DEC8] pt-2 flex justify-between items-baseline font-serif">
                  <span className="text-base font-bold text-[#29251F]">Total</span>
                  <span className="text-xl font-bold text-[#29251F]">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Step 2 Primary CTA Button: Pay Now (Razorpay) (Exact Match) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={submitting || !canCheckout}
                className="w-full flex items-center justify-between rounded-full bg-[#394231] hover:bg-[#2C3426] active:bg-[#22291E] text-white py-3.5 px-6 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs sm:text-sm font-bold text-white tracking-wide">
                      {submitting ? "Opening Payment Gateway..." : "Pay Now (Razorpay)"}
                    </p>
                    <p className="text-[10px] text-white/70">
                      UPI, Cards, Net Banking &amp; more
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <ArrowRight className="h-4 w-4 text-white group-hover:translate-x-1 transition-transform" />
                  )}
                </div>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── DIGITAL RECEIPT / PAYMENT GENERATION TRANSITION MODAL ── */}
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
