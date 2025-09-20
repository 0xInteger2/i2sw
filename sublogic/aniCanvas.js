document.addEventListener("DOMContentLoaded", () => {
  const openModal = document.getElementById("openModal");
  const closeModal = document.querySelector("#bgCanvasBackside h1");
  const bgCanvasBackside = document.getElementById("bgCanvasBackside");
  const leftContentInner = document.getElementById("leftContentInner");
  const backIframe = document.getElementById("backIframe");
  const frontSvg = document.getElementById("frontSvg");

  // Set transform origin for scale from top-right
  bgCanvasBackside.style.transformOrigin = "top right";

  function resizeElements() {
    // Fill parent exactly
    const rect = leftContentInner.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
    const bodyPaddingTop =
      parseFloat(getComputedStyle(document.body).paddingTop) || 0;

    // Front SVG
    frontSvg.style.width = "100%";
    frontSvg.style.height = "100%";
    frontSvg.style.top = "0";
    frontSvg.style.left = "0";

    // Modal container
    bgCanvasBackside.style.width = `${rect.width}px`;
    bgCanvasBackside.style.height = `${rect.height}px`;
    bgCanvasBackside.style.top = `${rect.top + scrollTop - bodyPaddingTop}px`;
    bgCanvasBackside.style.left = `${rect.left + scrollLeft}px`;

    // Iframe inside modal
    backIframe.style.width = `${rect.width}px`;
    backIframe.style.height = `${rect.height}px`;
  }

  // Open modal
  openModal.addEventListener("click", () => {
    resizeElements();
    bgCanvasBackside.style.pointerEvents = "auto";
    bgCanvasBackside.style.transition = "transform 0.3s linear"; // smooth scale
    bgCanvasBackside.style.transform = "scale(1)";
  });

  // Close modal
  closeModal.addEventListener("click", () => {
    bgCanvasBackside.style.transition = "transform 0.3s linear";
    bgCanvasBackside.style.transform = "scale(0)";
    bgCanvasBackside.style.pointerEvents = "none";
  });

  // Resize dynamically
  window.addEventListener("resize", resizeElements);

  // Initial sizing
  resizeElements();
});
