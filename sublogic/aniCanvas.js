document.addEventListener("DOMContentLoaded", () => {
  const openModal = document.getElementById("openModal");
  const closeModal = document.querySelector("#bgCanvasBackside h1");
  const bgCanvasBackside = document.getElementById("bgCanvasBackside");
  const backIframe = document.getElementById("backIframe");

  function resizeIframe() {
    const rect = bgCanvasBackside.getBoundingClientRect();
    backIframe.style.width = `${rect.width}px`;
    backIframe.style.height = `${rect.height}px`;
  }

  openModal.addEventListener("click", () => {
    resizeIframe(); // size it before opening
    bgCanvasBackside.style.pointerEvents = "auto";
    bgCanvasBackside.style.transform = "scale(1)"; // scale in from top-right
  });

  closeModal.addEventListener("click", () => {
    bgCanvasBackside.style.transform = "scale(0)";
    bgCanvasBackside.style.pointerEvents = "none";
  });

  // Update iframe size on window resize
  window.addEventListener("resize", () => {
    if (bgCanvasBackside.style.transform === "scale(1)") {
      resizeIframe();
    }
  });
});
