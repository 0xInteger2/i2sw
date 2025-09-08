document.addEventListener("DOMContentLoaded", () => {
  const cardInner = document.getElementById("leftContentInner");
  const canvas = document.getElementById("bgCanvas");
  const iframe = document.getElementById("backIframe");
  const container = cardInner;

  /* FLIP LOGIC */
  cardInner.addEventListener("click", () => {
    cardInner.classList.toggle("flipped");
  });

  /* RESIZE CANVAS */
  function resizeCanvas() {
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
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

    /* RESIZE IFRAME */
    const scaleX = width / 1000; // reference width
    const scaleY = height / 750; // reference height
    const scale = Math.min(scaleX, scaleY);
    iframe.style.transform = `scale(${scale})`;
    iframe.style.top = `${(containerHeight - height) / 2}px`;
    iframe.style.left = `${(containerWidth - width) / 2}px`;
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  /* ANIMATED CANVAS LOGIC */
  const totalFrames = 180;
  const frames = [];
  for (let n = 1; n <= totalFrames; n++) {
    frames.push(`images/pepe-beach/svgs/card image${n}.svg`);
  }

  const spinner = document.getElementById("spinner");
  const ctx = canvas.getContext("2d");
  const fps = 10;
  const frameDuration = 1000 / fps;
  const preloadedImages = [];
  let loadedCount = 0;

  frames.forEach((src, idx) => {
    const img = new Image();
    img.onload = () => {
      preloadedImages[idx] = img;
      loadedCount++;
      if (loadedCount === totalFrames) {
        spinner.style.display = "none";
        requestAnimationFrame(animate);
      }
    };
    img.src = src;
  });

  let currentIndex = 0;
  let lastTimestamp = 0;

  function animate(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaTime = timestamp - lastTimestamp;

    if (deltaTime >= frameDuration) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        preloadedImages[currentIndex],
        0,
        0,
        canvas.width,
        canvas.height
      );
      currentIndex = (currentIndex + 1) % totalFrames;
      lastTimestamp = timestamp;
    }

    requestAnimationFrame(animate);
  }
});
