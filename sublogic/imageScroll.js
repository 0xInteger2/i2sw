document.addEventListener("DOMContentLoaded", () => {
  const rightContent = document.getElementById("rightContent");
  if (!rightContent) return;

  // Performance optimizations
  let animationId = null;
  let isVisible = true;
  let originalChildCount = rightContent.children.length;

  // Use documentFragment for better performance
  const cloneContent = () => {
    const fragment = document.createDocumentFragment();
    const children = Array.from(rightContent.children).slice(
      0,
      originalChildCount
    );

    children.forEach((node) => {
      fragment.appendChild(node.cloneNode(true));
    });

    rightContent.appendChild(fragment);
  };

  // Only clone if we don't already have duplicates
  if (rightContent.children.length === originalChildCount) {
    cloneContent();
  }

  // Optimized image preloading with lazy loading
  const preloadImages = () => {
    const images = rightContent.querySelectorAll("img[src]");
    const imagePromises = [];

    images.forEach((img) => {
      if (img.complete) {
        img.style.visibility = "visible";
        return;
      }

      const promise = new Promise((resolve) => {
        const tempImg = new Image();
        tempImg.onload = tempImg.onerror = () => {
          img.style.visibility = "visible";
          resolve();
          // Clean up reference
          tempImg.onload = tempImg.onerror = null;
        };
        tempImg.src = img.src;
      });

      imagePromises.push(promise);
    });

    return Promise.all(imagePromises);
  };

  preloadImages();

  // Scroll state
  let scrollPos = 0,
    displayPos = 0;
  const baseSpeed = 0.5;
  let velocity = baseSpeed;
  const friction = 0.95;
  const maxVelocity = 150;
  const velocityBoost = 45;

  // Touch/drag state
  let isDragging = false;
  let draggingAxis = null;
  let startX = 0,
    startY = 0;
  let dragStartScroll = 0;
  let lastTouchTime = 0;
  let lastTouchPos = 0;

  // Cached calculations
  let cachedIsHorizontal = window.innerWidth <= 1079;
  let cachedTotalLength = 0;

  const updateCache = () => {
    cachedIsHorizontal = window.innerWidth <= 1079;
    cachedTotalLength = cachedIsHorizontal
      ? rightContent.scrollWidth / 2
      : rightContent.scrollHeight / 2;
  };

  // Throttled resize handler
  let resizeTimeout;
  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateCache, 100);
  };

  window.addEventListener("resize", handleResize, { passive: true });
  updateCache();

  const lerp = (a, b, t) => a + (b - a) * t;

  const loopScroll = () => {
    if (displayPos >= cachedTotalLength) {
      displayPos -= cachedTotalLength;
      scrollPos -= cachedTotalLength;
    } else if (displayPos < 0) {
      displayPos += cachedTotalLength;
      scrollPos += cachedTotalLength;
    }
  };

  // Optimized wheel handler with passive option where possible
  const handleWheel = (e) => {
    e.preventDefault();
    velocity += e.deltaY * 0.25;
  };

  // Touch handlers with improved performance
  const handleTouchStart = (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    draggingAxis = null;
    isDragging = false;
    velocity = 0;
    lastTouchTime = Date.now();
    lastTouchPos = startX;
  };

  const handleTouchMove = (e) => {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - startX;
    const dy = currentY - startY;

    if (!draggingAxis && Math.sqrt(dx * dx + dy * dy) > 10) {
      draggingAxis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }

    if (draggingAxis === "x" && cachedIsHorizontal) {
      e.preventDefault();
      if (!isDragging) {
        isDragging = true;
        dragStartScroll = scrollPos;
      }
      scrollPos = dragStartScroll - dx;

      const now = Date.now();
      const dt = now - lastTouchTime;
      if (dt > 0) {
        velocity = ((lastTouchPos - currentX) / dt) * velocityBoost;
        velocity = Math.max(Math.min(velocity, maxVelocity), -maxVelocity);
        lastTouchTime = now;
        lastTouchPos = currentX;
      }
    }
  };

  const handleTouchEnd = () => {
    isDragging = false;
    draggingAxis = null;
    if (Math.abs(velocity) < baseSpeed) velocity = baseSpeed;
  };

  // Add event listeners
  rightContent.addEventListener("wheel", handleWheel);
  rightContent.addEventListener("touchstart", handleTouchStart, {
    passive: true,
  });
  rightContent.addEventListener("touchmove", handleTouchMove);
  rightContent.addEventListener("touchend", handleTouchEnd, { passive: true });

  // Intersection Observer to pause animation when not visible
  const observer = new IntersectionObserver(
    (entries) => {
      isVisible = entries[0].isIntersecting;
      if (isVisible && !animationId) {
        animate();
      }
    },
    { threshold: 0.1 }
  );

  observer.observe(rightContent);

  // Optimized animation loop
  function animate() {
    if (!isVisible) {
      animationId = null;
      return;
    }

    if (!isDragging) {
      velocity *= friction;
      if (Math.abs(velocity) < baseSpeed) velocity = baseSpeed;
      scrollPos += velocity;
    } else {
      displayPos = scrollPos;
    }

    displayPos = lerp(displayPos, scrollPos, 0.12);
    loopScroll();

    const transform = cachedIsHorizontal
      ? `translateX(-${displayPos}px)`
      : `translateY(-${displayPos}px)`;

    rightContent.style.transform = transform;

    animationId = requestAnimationFrame(animate);
  }

  // Start animation
  animate();

  // Cleanup function (call this when removing the component)
  window.cleanupInfiniteScroll = () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    observer.disconnect();
    window.removeEventListener("resize", handleResize);
    rightContent.removeEventListener("wheel", handleWheel);
    rightContent.removeEventListener("touchstart", handleTouchStart);
    rightContent.removeEventListener("touchmove", handleTouchMove);
    rightContent.removeEventListener("touchend", handleTouchEnd);

    clearTimeout(resizeTimeout);
  };
});
