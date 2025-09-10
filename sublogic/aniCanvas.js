document.addEventListener("DOMContentLoaded", () => {
  const cardInner = document.getElementById("leftContentInner");
  const frontSvg = document.getElementById("frontSvg"); // single SVG in DOM
  const backside = document.getElementById("bgCanvasBackside");
  const iframe = document.getElementById("backIframe");

  // ---------------- FLIP LOGIC ----------------
  let isFlipping = false;

  function getTransitionDuration() {
    const style = window.getComputedStyle(cardInner);
    const duration = style.transitionDuration || "0.8s";
    if (duration.includes("ms")) return parseFloat(duration);
    if (duration.includes("s")) return parseFloat(duration) * 1000;
    return 800;
  }

  cardInner.addEventListener("click", () => {
    if (isFlipping) return;
    isFlipping = true;

    const duration = getTransitionDuration();
    const flippingToBack = !cardInner.classList.contains("flipped");
    cardInner.classList.toggle("flipped");

    // Ensure back is visible from the start
    backside.style.opacity = "1";
    backside.style.pointerEvents = "auto";

    // Animate front fade out
    frontSvg.style.transition = `opacity ${duration}ms ease-in-out`;
    frontSvg.style.opacity = flippingToBack ? "0" : "1";

    // Reset transition after animation
    setTimeout(() => {
      if (!flippingToBack) {
        backside.style.pointerEvents = "none";
      }
      isFlipping = false;
    }, duration);
  });

  // Initial states
  frontSvg.style.opacity = "1";
  backside.style.opacity = "1"; // always visible
  backside.style.pointerEvents = "none";

  // ---------------- RESIZE LOGIC ----------------
  function resizeCard() {
    const containerWidth = cardInner.clientWidth;
    const containerHeight = cardInner.clientHeight;
    const aspect = 8 / 6; // same aspect ratio

    let width = containerWidth;
    let height = width / aspect;
    if (height > containerHeight) {
      height = containerHeight;
      width = height * aspect;
    }

    frontSvg.style.width = `${width}px`;
    frontSvg.style.height = `${height}px`;
    frontSvg.style.position = "absolute";
    frontSvg.style.top = `${(containerHeight - height) / 2}px`;
    frontSvg.style.left = `${(containerWidth - width) / 2}px`;

    backside.style.width = `${width}px`;
    backside.style.height = `${height}px`;
    backside.style.top = `${(containerHeight - height) / 2}px`;
    backside.style.left = `${(containerWidth - width) / 2}px`;

    const scaleX = width / 1000;
    const scaleY = height / 750;
    const scale = Math.min(scaleX, scaleY);
    iframe.style.transform = `scale(${scale})`;
    iframe.style.width = "1000px";
    iframe.style.height = "750px";
    iframe.style.top = "0px";
    iframe.style.left = "0px";
  }

  window.addEventListener("resize", resizeCard);
  resizeCard();
});
