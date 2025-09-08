document.addEventListener("DOMContentLoaded", () => {
  const cardInner = document.getElementById("leftContentInner");
  const backside = document.getElementById("bgCanvasBackside");
  const iframe = document.getElementById("backIframe");
  const canvas = document.getElementById("bgCanvas");

  // Flip logic with opacity reveal
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
      setTimeout(() => {
        backside.style.opacity = "1"; // fade in after halfway
      }, halfway);
    } else {
      backside.style.opacity = "0"; // hide immediately
    }
  });

  backside.style.opacity = "0"; // initial state

  // Resize canvas and scale iframe dynamically
  function resizeCanvas() {
    const containerWidth = cardInner.clientWidth;
    const containerHeight = cardInner.clientHeight;
    const aspect = 8 / 6;

    let width = containerWidth;
    let height = width / aspect;
    if (height > containerHeight) {
      height = containerHeight;
      width = height * aspect;
    }

    canvas.width = width;
    canvas.height = height;
    canvas.style.position = "absolute";
    canvas.style.top = `${(containerHeight - height) / 2}px`;
    canvas.style.left = `${(containerWidth - width) / 2}px`;

    // Scale iframe
    const scaleX = width / 1000;
    const scaleY = height / 750;
    const scale = Math.min(scaleX, scaleY);
    iframe.style.transform = `scale(${scale})`;
    iframe.style.top = `${(containerHeight - height) / 2}px`;
    iframe.style.left = `${(containerWidth - width) / 2}px`;
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
});
