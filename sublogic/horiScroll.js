document.addEventListener("DOMContentLoaded", () => {
  const rightContent = document.getElementById("rightContent");
  const wrapper = document.querySelector(".rightContentWrapper");

  if (!rightContent || !wrapper) return;

  let isSmallScreen = () => window.innerWidth <= 1079;
  let scrollTimeout;
  let isTouching = false; // track touch state

  function handleWheelScroll(e) {
    if (!isSmallScreen()) return;

    e.preventDefault();

    // Pause animation while scrolling
    rightContent.style.animationPlayState = "paused";

    // Convert vertical scroll → horizontal scroll
    wrapper.scrollLeft += e.deltaY;

    // Resume only if not touching
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      if (!isTouching) {
        rightContent.style.animationPlayState = "running";
      }
    }, 1500);
  }

  // Listen for touch start/end to sync with CSS :active
  wrapper.addEventListener("touchstart", () => {
    isTouching = true;
    rightContent.style.animationPlayState = "paused";
  });

  wrapper.addEventListener("touchend", () => {
    isTouching = false;
    // Delay resume slightly so it feels natural
    setTimeout(() => {
      if (!isTouching) {
        rightContent.style.animationPlayState = "running";
      }
    }, 500);
  });

  wrapper.addEventListener("wheel", handleWheelScroll, { passive: false });

  // Cleanup function
  window.cleanupHorizontalScroll = () => {
    wrapper.removeEventListener("wheel", handleWheelScroll);
    wrapper.removeEventListener("touchstart", () => {});
    wrapper.removeEventListener("touchend", () => {});
    clearTimeout(scrollTimeout);
  };
});

window.addEventListener("beforeunload", () => {
  if (window.cleanupHorizontalScroll) {
    window.cleanupHorizontalScroll();
  }
});
