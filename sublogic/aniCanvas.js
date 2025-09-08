document.addEventListener("DOMContentLoaded", () => {
  const cardInner = document.getElementById("leftContentInner");
  const frontCanvas = document.getElementById("bgCanvas");
  const backside = document.getElementById("bgCanvasBackside");
  const iframe = document.getElementById("backIframe");
  const spinner = document.getElementById("spinner");
  const ctx = frontCanvas.getContext("2d");

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
    const halfway = duration / 2;
    const flippingToBack = !cardInner.classList.contains("flipped");
    cardInner.classList.toggle("flipped");

    // Pause canvas animation during flip
    animationRunning = false;

    // Ensure 3D rotation commits before changing visibility
    requestAnimationFrame(() => {
      let start = null;
      function flipStep(timestamp) {
        if (!start) start = timestamp;
        const elapsed = timestamp - start;

        if (elapsed >= halfway) {
          if (flippingToBack) {
            frontCanvas.style.opacity = "0";
            backside.style.opacity = "1";
            backside.style.pointerEvents = "auto";
          } else {
            backside.style.opacity = "0";
            backside.style.pointerEvents = "none";
            frontCanvas.style.opacity = "1";
          }
        }

        if (elapsed < duration) {
          requestAnimationFrame(flipStep);
        } else {
          // Resume animation after flip
          animationRunning = true;
          requestAnimationFrame(animate);
          isFlipping = false;
        }
      }
      requestAnimationFrame(flipStep);
    });
  });

  // Initial states
  frontCanvas.style.opacity = "1";
  backside.style.opacity = "0";
  backside.style.pointerEvents = "none";

  // ---------------- RESIZE LOGIC ----------------
  function resizeCard() {
    const containerWidth = cardInner.clientWidth;
    const containerHeight = cardInner.clientHeight;
    const aspect = 8 / 6;

    let width = containerWidth;
    let height = width / aspect;
    if (height > containerHeight) {
      height = containerHeight;
      width = height * aspect;
    }

    // Front canvas
    frontCanvas.width = width;
    frontCanvas.height = height;
    frontCanvas.style.position = "absolute";
    frontCanvas.style.top = `${(containerHeight - height) / 2}px`;
    frontCanvas.style.left = `${(containerWidth - width) / 2}px`;

    // Back container
    backside.style.width = `${width}px`;
    backside.style.height = `${height}px`;
    backside.style.top = `${(containerHeight - height) / 2}px`;
    backside.style.left = `${(containerWidth - width) / 2}px`;

    // Scale iframe
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

  // ---------------- FRONT CANVAS ANIMATION ----------------
  const totalFrames = 180;
  const frames = [];
  for (let n = 1; n <= totalFrames; n++) {
    frames.push(`images/pepe-beach/svgs/card image${n}.svg`);
  }

  const fps = 10;
  const frameDuration = 1000 / fps;
  const preloadedImages = [];
  let loadedCount = 0;
  let currentIndex = 0;
  let lastTimestamp = 0;
  let animationRunning = true;

  frames.forEach((src, idx) => {
    const img = new Image();
    img.onload = () => {
      preloadedImages[idx] = img;
      loadedCount++;
      if (loadedCount === totalFrames && spinner) {
        spinner.style.display = "none";
        requestAnimationFrame(animate);
      }
    };
    img.src = src;
  });

  function animate(timestamp) {
    if (!animationRunning) return;

    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaTime = timestamp - lastTimestamp;

    if (deltaTime >= frameDuration) {
      ctx.clearRect(0, 0, frontCanvas.width, frontCanvas.height);
      ctx.drawImage(
        preloadedImages[currentIndex],
        0,
        0,
        frontCanvas.width,
        frontCanvas.height
      );
      currentIndex = (currentIndex + 1) % totalFrames;
      lastTimestamp = timestamp;
    }

    requestAnimationFrame(animate);
  }
});
