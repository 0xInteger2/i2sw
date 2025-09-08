document.addEventListener("DOMContentLoaded", () => {
  const cardInner = document.getElementById("leftContentInner");
  const frontCanvas = document.getElementById("bgCanvas");
  const backside = document.getElementById("bgCanvasBackside");
  const iframe = document.getElementById("backIframe");

  // Parse CSS transition duration
  function getTransitionDuration() {
    const style = window.getComputedStyle(cardInner);
    const duration = style.transitionDuration || "0.8s";
    if (duration.includes("ms")) return parseFloat(duration);
    if (duration.includes("s")) return parseFloat(duration) * 1000;
    return 800;
  }

  /* FLIP LOGIC WITH HALFWAY VISIBILITY */
  cardInner.addEventListener("click", () => {
    cardInner.classList.toggle("flipped");
    const duration = getTransitionDuration();
    const halfway = duration / 2;

    if (cardInner.classList.contains("flipped")) {
      // Front → Back
      setTimeout(() => {
        frontCanvas.style.visibility = "hidden";
        backside.style.visibility = "visible";
      }, halfway);
    } else {
      // Back → Front
      setTimeout(() => {
        backside.style.visibility = "hidden";
        frontCanvas.style.visibility = "visible";
      }, halfway);
    }
  });

  // Initial state
  frontCanvas.style.visibility = "visible";
  backside.style.visibility = "hidden";

  /* DYNAMIC RESIZING OF FRONT AND BACK */
  function resizeCard() {
    const containerWidth = cardInner.clientWidth;
    const containerHeight = cardInner.clientHeight;
    const aspect = 8 / 6;

    // Calculate canvas size
    let width = containerWidth;
    let height = width / aspect;
    if (height > containerHeight) {
      height = containerHeight;
      width = height * aspect;
    }

    // Resize front canvas
    frontCanvas.width = width;
    frontCanvas.height = height;
    frontCanvas.style.position = "absolute";
    frontCanvas.style.top = `${(containerHeight - height) / 2}px`;
    frontCanvas.style.left = `${(containerWidth - width) / 2}px`;

    // Resize back container
    backside.style.width = `${width}px`;
    backside.style.height = `${height}px`;
    backside.style.top = `${(containerHeight - height) / 2}px`;
    backside.style.left = `${(containerWidth - width) / 2}px`;

    // Scale iframe proportionally
    const scaleX = width / 1000; // reference iframe width
    const scaleY = height / 750; // reference iframe height
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
