document.addEventListener("DOMContentLoaded", () => {
  const cardInner = document.getElementById("leftContentInner");
  const frontCanvas = document.getElementById("bgCanvas");
  const backside = document.getElementById("bgCanvasBackside");
  const iframe = document.getElementById("backIframe");

  function getTransitionDuration() {
    const style = window.getComputedStyle(cardInner);
    const duration = style.transitionDuration || "0.8s";
    if (duration.includes("ms")) return parseFloat(duration);
    if (duration.includes("s")) return parseFloat(duration) * 1000;
    return 800;
  }

  cardInner.addEventListener("click", () => {
    cardInner.classList.toggle("flipped");
    const duration = getTransitionDuration();
    const halfway = duration / 2;

    if (cardInner.classList.contains("flipped")) {
      // Front → Back
      setTimeout(() => {
        frontCanvas.style.opacity = "0"; // fade out front
        backside.style.opacity = "1"; // fade in back
        backside.style.pointerEvents = "auto"; // enable interaction
      }, halfway);
    } else {
      // Back → Front
      setTimeout(() => {
        backside.style.opacity = "0"; // fade out back
        backside.style.pointerEvents = "none"; // disable interaction
        frontCanvas.style.opacity = "1"; // fade in front
      }, halfway);
    }
  });

  // Initial states
  frontCanvas.style.opacity = "1";
  backside.style.opacity = "0";
  backside.style.pointerEvents = "none";

  // Dynamic resize for canvas and iframe (same as before)
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

    frontCanvas.width = width;
    frontCanvas.height = height;
    frontCanvas.style.position = "absolute";
    frontCanvas.style.top = `${(containerHeight - height) / 2}px`;
    frontCanvas.style.left = `${(containerWidth - width) / 2}px`;

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
