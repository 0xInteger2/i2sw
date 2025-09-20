// Minimal horizontal scroll wheel for carousel on smaller screens
document.addEventListener("DOMContentLoaded", () => {
  const rightContent = document.getElementById("rightContent");
  const wrapper = document.querySelector(".rightContentWrapper");

  if (!rightContent || !wrapper) return;

  let isSmallScreen = () => window.innerWidth <= 1079;
  let scrollTimeout;

  function handleWheelScroll(e) {
    // Only apply on small screens
    if (!isSmallScreen()) return;

    // Prevent default vertical scroll
    e.preventDefault();

    // Pause animation while manually scrolling
    rightContent.style.animationPlayState = "paused";

    // Convert vertical wheel movement to horizontal scroll
    wrapper.scrollLeft += e.deltaY;

    // Resume animation after user stops scrolling
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      rightContent.style.animationPlayState = "running";
    }, 1500);
  }

  // Add wheel event listener to the wrapper
  wrapper.addEventListener("wheel", handleWheelScroll, { passive: false });

  // Cleanup function
  window.cleanupHorizontalScroll = () => {
    wrapper.removeEventListener("wheel", handleWheelScroll);
    clearTimeout(scrollTimeout);
  };
});

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (window.cleanupHorizontalScroll) {
    window.cleanupHorizontalScroll();
  }
});
