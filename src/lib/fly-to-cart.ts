/**
 * Fly-to-Cart Animation Utility
 * Creates a smooth parabolic arc animation of a product image thumbnail flying into the navbar cart icon.
 */

export interface FlyToCartOptions {
  imageUrl?: string | null;
  sourceElement?: HTMLElement | null;
  sourceEvent?: React.MouseEvent | MouseEvent | null;
  productId?: string | null;
  targetSelector?: string;
}

export function flyToCart(options: FlyToCartOptions = {}) {
  if (typeof window === "undefined") return;

  const {
    imageUrl,
    sourceElement,
    sourceEvent,
    productId,
    targetSelector = "#navbar-cart-icon, [data-navbar-cart]",
  } = options;

  // 1. Locate the target cart icon in the navbar
  const targetElement = (document.querySelector(targetSelector) as HTMLElement) || null;
  const targetRect = targetElement
    ? targetElement.getBoundingClientRect()
    : {
        left: window.innerWidth - 60,
        top: 24,
        width: 32,
        height: 32,
      };

  // 2. Locate the origin / starting position
  let startRect: { left: number; top: number; width: number; height: number } | null = null;

  // Check for specific product image element in DOM first for highest visual fidelity
  if (productId) {
    const productImg = document.querySelector(
      `[data-product-img="${productId}"], [data-product-id="${productId}"] img`
    ) as HTMLElement | null;
    if (productImg) {
      const rect = productImg.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0) {
        startRect = rect;
      }
    }
  }

  // If no product image found, use the source element or button
  if (!startRect && sourceElement) {
    // Check if the source element has an image child or adjacent image
    const imgInside = sourceElement.querySelector("img") as HTMLElement | null;
    if (imgInside) {
      startRect = imgInside.getBoundingClientRect();
    } else {
      startRect = sourceElement.getBoundingClientRect();
    }
  }

  // If source event passed
  if (!startRect && sourceEvent) {
    const currentTarget = sourceEvent.currentTarget as HTMLElement | null;
    if (currentTarget && typeof currentTarget.getBoundingClientRect === "function") {
      startRect = currentTarget.getBoundingClientRect();
    } else {
      startRect = {
        left: sourceEvent.clientX - 35,
        top: sourceEvent.clientY - 35,
        width: 70,
        height: 70,
      };
    }
  }

  // Fallback to screen center bottom if no origin found
  if (!startRect || startRect.width === 0) {
    startRect = {
      left: window.innerWidth / 2 - 40,
      top: window.innerHeight / 2,
      width: 80,
      height: 80,
    };
  }

  // 3. Prepare the flying thumbnail
  const flyerWidth = Math.max(56, Math.min(startRect.width || 80, 110));
  const flyerHeight = Math.max(56, Math.min(startRect.height || 80, 110));

  const startX = startRect.left + (startRect.width - flyerWidth) / 2;
  const startY = startRect.top + (startRect.height - flyerHeight) / 2;

  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  const deltaX = targetCenterX - (startX + flyerWidth / 2);
  const deltaY = targetCenterY - (startY + flyerHeight / 2);

  const flyer = document.createElement("div");
  flyer.className = "fly-to-cart-thumbnail";
  flyer.style.position = "fixed";
  flyer.style.left = `${startX}px`;
  flyer.style.top = `${startY}px`;
  flyer.style.width = `${flyerWidth}px`;
  flyer.style.height = `${flyerHeight}px`;
  flyer.style.borderRadius = "18px";
  flyer.style.overflow = "hidden";
  flyer.style.boxShadow =
    "0 14px 32px rgba(41, 37, 31, 0.38), 0 0 0 2.5px #E8D5BC, 0 0 16px rgba(194, 107, 89, 0.3)";
  flyer.style.zIndex = "999999";
  flyer.style.pointerEvents = "none";
  flyer.style.willChange = "transform, opacity";
  flyer.style.backgroundColor = "#FAF5ED";

  const img = document.createElement("img");
  img.src =
    imageUrl ||
    "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200&auto=format&fit=crop&q=80";
  img.alt = "Cart product";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "cover";
  img.style.display = "block";

  flyer.appendChild(img);
  document.body.appendChild(flyer);

  // 4. Parabolic trajectory keyframes
  // Arcs upwards into the air with a slight rotation before plunging into cart
  const arcLift = Math.min(80, Math.max(40, Math.abs(deltaY) * 0.25));

  const keyframes = [
    {
      transform: "translate3d(0, 0, 0) scale(1) rotate(0deg)",
      opacity: 1,
    },
    {
      transform: `translate3d(${deltaX * 0.32}px, ${deltaY * 0.2 - arcLift}px, 0) scale(0.92) rotate(-10deg)`,
      opacity: 0.98,
      offset: 0.35,
    },
    {
      transform: `translate3d(${deltaX * 0.78}px, ${deltaY * 0.72 - arcLift * 0.4}px, 0) scale(0.48) rotate(14deg)`,
      opacity: 0.88,
      offset: 0.78,
    },
    {
      transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.08) rotate(0deg)`,
      opacity: 0,
      offset: 1,
    },
  ];

  try {
    const animation = flyer.animate(keyframes, {
      duration: 720,
      easing: "cubic-bezier(0.25, 0.9, 0.35, 1)",
      fill: "forwards",
    });

    const cleanup = () => {
      if (flyer.parentNode) {
        flyer.parentNode.removeChild(flyer);
      }
      // Notify cart icon in navbar to trigger bounce animation
      window.dispatchEvent(
        new CustomEvent("cart-item-fly-completed", {
          detail: { productId, imageUrl },
        })
      );
    };

    animation.onfinish = cleanup;
    animation.oncancel = cleanup;
    setTimeout(cleanup, 800); // Safety fallback
  } catch {
    // If Web Animations API fails, fallback gracefully
    if (flyer.parentNode) {
      flyer.parentNode.removeChild(flyer);
    }
    window.dispatchEvent(new CustomEvent("cart-item-fly-completed"));
  }
}
