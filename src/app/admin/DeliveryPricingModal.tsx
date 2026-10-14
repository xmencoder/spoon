"use client";

import React, { useState, useEffect } from "react";
import type { DeliveryPricingConfig } from "@/lib/delivery-types";
import { updateAdminDeliveryPricingAction } from "./delivery-pricing-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  Truck,
  CloudRain,
  TrafficCone,
  Zap,
  Calculator,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface DeliveryPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPricing: DeliveryPricingConfig;
  onSuccess: (updated: DeliveryPricingConfig) => void;
}

export function DeliveryPricingModal({
  isOpen,
  onClose,
  currentPricing,
  onSuccess,
}: DeliveryPricingModalProps) {
  const [baseFare, setBaseFare] = useState(currentPricing.baseFare || 50);
  const [baseDistanceKm, setBaseDistanceKm] = useState(
    currentPricing.baseDistanceKm || 1
  );
  const [perKmRate, setPerKmRate] = useState(currentPricing.perKmRate || 10);
  const [maxDistanceKm, setMaxDistanceKm] = useState(
    currentPricing.maxDistanceKm || 40
  );

  // Rain Surge
  const [rainEnabled, setRainEnabled] = useState(
    currentPricing.rainSurge?.enabled || false
  );
  const [rainAmount, setRainAmount] = useState(
    currentPricing.rainSurge?.amount ?? 25
  );

  // Heavy Traffic Surge
  const [trafficEnabled, setTrafficEnabled] = useState(
    currentPricing.trafficSurge?.enabled || false
  );
  const [trafficAmount, setTrafficAmount] = useState(
    currentPricing.trafficSurge?.amount ?? 20
  );

  // Peak / Custom Surge
  const [customEnabled, setCustomEnabled] = useState(
    currentPricing.customSurge?.enabled || false
  );
  const [customAmount, setCustomAmount] = useState(
    currentPricing.customSurge?.amount ?? 30
  );
  const [customLabel, setCustomLabel] = useState(
    currentPricing.customSurge?.label || "Peak Rush Surcharge"
  );

  // UI state
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewDistance, setPreviewDistance] = useState<number>(5);

  useEffect(() => {
    if (isOpen) {
      setBaseFare(currentPricing.baseFare);
      setBaseDistanceKm(currentPricing.baseDistanceKm);
      setPerKmRate(currentPricing.perKmRate);
      setMaxDistanceKm(currentPricing.maxDistanceKm);
      setRainEnabled(currentPricing.rainSurge?.enabled || false);
      setRainAmount(currentPricing.rainSurge?.amount ?? 25);
      setTrafficEnabled(currentPricing.trafficSurge?.enabled || false);
      setTrafficAmount(currentPricing.trafficSurge?.amount ?? 20);
      setCustomEnabled(currentPricing.customSurge?.enabled || false);
      setCustomAmount(currentPricing.customSurge?.amount ?? 30);
      setCustomLabel(
        currentPricing.customSurge?.label || "Peak Rush Surcharge"
      );
      setErrorMsg(null);
    }
  }, [isOpen, currentPricing]);

  if (!isOpen) return null;

  // Calculation for preview
  const extraKm = Math.max(0, previewDistance - (Number(baseDistanceKm) || 0));
  const distanceCost = Math.round(extraKm * (Number(perKmRate) || 0));
  const activeRainCost = rainEnabled ? Number(rainAmount) || 0 : 0;
  const activeTrafficCost = trafficEnabled ? Number(trafficAmount) || 0 : 0;
  const activeCustomCost = customEnabled ? Number(customAmount) || 0 : 0;
  const previewTotal =
    (Number(baseFare) || 0) +
    distanceCost +
    activeRainCost +
    activeTrafficCost +
    activeCustomCost;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const payload: DeliveryPricingConfig = {
      baseFare: Math.max(0, Number(baseFare) || 0),
      baseDistanceKm: Math.max(0, Number(baseDistanceKm) || 0),
      perKmRate: Math.max(0, Number(perKmRate) || 0),
      maxDistanceKm: Math.max(1, Number(maxDistanceKm) || 40),
      rainSurge: {
        enabled: rainEnabled,
        amount: Math.max(0, Number(rainAmount) || 0),
        label: "Rain Surcharge",
      },
      trafficSurge: {
        enabled: trafficEnabled,
        amount: Math.max(0, Number(trafficAmount) || 0),
        label: "Heavy Traffic Surcharge",
      },
      customSurge: {
        enabled: customEnabled,
        amount: Math.max(0, Number(customAmount) || 0),
        label: customLabel.trim() || "Peak Rush Surcharge",
      },
    };

    try {
      const res = await updateAdminDeliveryPricingAction(payload);
      if (!res.success) {
        throw new Error(res.error || "Failed to update delivery pricing");
      }
      onSuccess(payload);
      onClose();
    } catch (err: any) {
      console.error("Save delivery pricing error:", err);
      setErrorMsg(err?.message || "Failed to save delivery pricing");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-[#FFFDF9] border border-spoon-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-spoon-border/70 flex items-center justify-between bg-spoon-cream/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-spoon-sand/80 border border-spoon-border flex items-center justify-center text-spoon-dark">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-spoon-dark leading-tight">
                Delivery Charge & Distance Pricing
              </h3>
              <p className="text-xs text-spoon-muted">
                Configure per-km rates, base fare, and real-time weather & traffic surcharges.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-spoon-muted hover:text-spoon-dark hover:bg-spoon-sand/40 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-medium text-rose-900">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Base Fare & Per-Km Rate */}
          <div className="rounded-2xl border border-spoon-border bg-white p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-spoon-border/60 pb-2">
              <h4 className="font-serif font-bold text-sm text-spoon-dark flex items-center gap-2">
                <span>1. Distance Formula Rates</span>
              </h4>
              <span className="text-[10px] font-mono text-spoon-muted bg-spoon-sand/40 px-2 py-0.5 rounded-md">
                ₹{baseFare} Base + ₹{perKmRate}/km
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-spoon-dark mb-1">
                  Base Delivery Fare (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-spoon-muted">
                    ₹
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={baseFare}
                    onChange={(e) => setBaseFare(Number(e.target.value))}
                    className="pl-7 font-bold text-sm"
                    required
                  />
                </div>
                <span className="text-[10px] text-spoon-muted mt-1 block">
                  Minimum delivery charge
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-spoon-dark mb-1">
                  Base Distance (km)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={baseDistanceKm}
                    onChange={(e) => setBaseDistanceKm(Number(e.target.value))}
                    className="font-bold text-sm"
                    required
                  />
                </div>
                <span className="text-[10px] text-spoon-muted mt-1 block">
                  Included in base fare (e.g. 1 km)
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-spoon-dark mb-1">
                  Per Km Rate (₹/km)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-spoon-muted">
                    ₹
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={perKmRate}
                    onChange={(e) => setPerKmRate(Number(e.target.value))}
                    className="pl-7 font-bold text-sm"
                    required
                  />
                </div>
                <span className="text-[10px] text-spoon-muted mt-1 block">
                  Rate for distance beyond base
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-spoon-border/50 flex flex-wrap items-center justify-between text-xs text-spoon-muted gap-2">
              <span className="font-medium">
                Delivery Range Limit: Up to{" "}
                <strong className="text-spoon-dark">{maxDistanceKm} km</strong>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px]">Max Radius:</span>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={maxDistanceKm}
                  onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                  className="w-16 px-2 py-1 text-xs border border-spoon-border rounded-lg bg-spoon-cream/40 font-bold"
                />
                <span className="text-[11px]">km</span>
              </div>
            </div>
          </div>

          {/* Section 2: Extra Money / Surge Charges */}
          <div className="rounded-2xl border border-spoon-border bg-white p-4 space-y-4">
            <div className="border-b border-spoon-border/60 pb-2">
              <h4 className="font-serif font-bold text-sm text-spoon-dark flex items-center justify-between">
                <span>2. Extra Surges (Rain, Traffic & Peak Rush)</span>
                <span className="text-[10px] font-normal text-spoon-muted">
                  Toggle on/off as needed
                </span>
              </h4>
            </div>

            <div className="space-y-3">
              {/* Rain Charge */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  rainEnabled
                    ? "border-sky-300 bg-sky-50/60"
                    : "border-spoon-border bg-spoon-cream/30"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rainEnabled}
                        onChange={(e) => setRainEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center text-sky-700">
                        <CloudRain className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-serif font-bold text-xs text-spoon-dark block">
                          Rain Surcharge
                        </span>
                        <span className="text-[10px] text-spoon-muted block">
                          Add extra fee during monsoon or wet weather
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-xs font-semibold text-spoon-muted">
                      +₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={rainAmount}
                      disabled={!rainEnabled}
                      onChange={(e) => setRainAmount(Number(e.target.value))}
                      className="w-20 px-2 py-1 text-xs border border-spoon-border rounded-lg bg-white font-bold text-spoon-dark disabled:opacity-50"
                    />
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        rainEnabled
                          ? "bg-sky-100 text-sky-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {rainEnabled ? "ACTIVE" : "OFF"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Heavy Traffic Charge */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  trafficEnabled
                    ? "border-amber-300 bg-amber-50/60"
                    : "border-spoon-border bg-spoon-cream/30"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={trafficEnabled}
                        onChange={(e) => setTrafficEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                        <TrafficCone className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-serif font-bold text-xs text-spoon-dark block">
                          Heavy Traffic Surcharge
                        </span>
                        <span className="text-[10px] text-spoon-muted block">
                          Compensate riders during peak road jams
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-xs font-semibold text-spoon-muted">
                      +₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={trafficAmount}
                      disabled={!trafficEnabled}
                      onChange={(e) => setTrafficAmount(Number(e.target.value))}
                      className="w-20 px-2 py-1 text-xs border border-spoon-border rounded-lg bg-white font-bold text-spoon-dark disabled:opacity-50"
                    />
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        trafficEnabled
                          ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {trafficEnabled ? "ACTIVE" : "OFF"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Peak / Custom Surge */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  customEnabled
                    ? "border-purple-300 bg-purple-50/60"
                    : "border-spoon-border bg-spoon-cream/30"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customEnabled}
                        onChange={(e) => setCustomEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={customLabel}
                          onChange={(e) => setCustomLabel(e.target.value)}
                          placeholder="Peak Surcharge Label"
                          className="font-serif font-bold text-xs text-spoon-dark bg-transparent border-b border-dashed border-spoon-border focus:outline-hidden"
                        />
                        <span className="text-[10px] text-spoon-muted block">
                          Festival, midnight rush, or holiday surge
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-xs font-semibold text-spoon-muted">
                      +₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={customAmount}
                      disabled={!customEnabled}
                      onChange={(e) => setCustomAmount(Number(e.target.value))}
                      className="w-20 px-2 py-1 text-xs border border-spoon-border rounded-lg bg-white font-bold text-spoon-dark disabled:opacity-50"
                    />
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        customEnabled
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {customEnabled ? "ACTIVE" : "OFF"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Live Formula & Preview Calculator */}
          <div className="rounded-2xl border border-spoon-border/80 bg-spoon-sand/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-serif font-bold text-xs text-spoon-dark flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-spoon-caramel" />
                <span>Live Formula & Customer Price Preview</span>
              </span>
              <div className="flex items-center gap-1.5">
                {[2, 5, 10, 18].map((km) => (
                  <button
                    key={km}
                    type="button"
                    onClick={() => setPreviewDistance(km)}
                    className={`px-2 py-0.5 text-[10px] rounded-md font-bold transition-all cursor-pointer ${
                      previewDistance === km
                        ? "bg-spoon-dark text-white shadow-xs"
                        : "bg-spoon-sand/50 text-spoon-dark hover:bg-spoon-sand"
                    }`}
                  >
                    {km} km
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-spoon-border text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between text-spoon-muted border-b border-spoon-border/50 pb-2">
                <span className="font-mono text-[11px] text-spoon-dark font-medium">
                  Formula: ₹{baseFare} Base + max(0, dist − {baseDistanceKm}) × ₹{perKmRate}/km
                  {(rainEnabled || trafficEnabled || customEnabled) && (
                    <span className="text-amber-700 font-bold ml-1">
                      + Surges
                    </span>
                  )}
                </span>
                <span className="text-[10px] bg-spoon-cream px-2 py-0.5 rounded-md font-bold text-spoon-dark">
                  Test Distance: {previewDistance} km
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-spoon-muted block text-[10px]">Base Fare</span>
                  <span className="font-bold text-spoon-dark">₹{baseFare}</span>
                </div>
                <div>
                  <span className="text-spoon-muted block text-[10px]">
                    Distance ({extraKm.toFixed(1)} km × ₹{perKmRate})
                  </span>
                  <span className="font-bold text-spoon-dark">₹{distanceCost}</span>
                </div>
                <div>
                  <span className="text-spoon-muted block text-[10px]">Surges</span>
                  <span className="font-bold text-spoon-dark">
                    ₹{activeRainCost + activeTrafficCost + activeCustomCost}
                  </span>
                </div>
                <div className="text-right sm:text-left">
                  <span className="text-spoon-muted block text-[10px]">Total Delivery Charge</span>
                  <span className="font-serif font-bold text-sm text-[#A34B3D]">
                    ₹{previewTotal}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-spoon-border/70 bg-spoon-cream/40 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-xs font-bold text-spoon-muted hover:text-spoon-dark"
          >
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 font-bold text-xs uppercase tracking-wider px-6 py-2.5 shadow-warm-sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Rates...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Apply Delivery Pricing</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
