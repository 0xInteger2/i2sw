document.addEventListener("DOMContentLoaded", () => {

const totalFrames = 180;
        const frames = [];
        for (let n = 1; n <= totalFrames; n++) {
          frames.push(`images/pepe-beach/svgs/card image${n}.svg`);
        }

        const spinner = document.getElementById("spinner");
        const canvas = document.getElementById("bgCanvas");
        const ctx = canvas.getContext("2d");

        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        window.addEventListener("resize", () => {
          width = window.innerWidth;
          height = window.innerHeight;
          canvas.width = width;
          canvas.height = height;
        });

        const fps = 10;
        const frameDuration = 1000 / fps;

        const preloadedImages = [];
        let loadedCount = 0;

        // Preload all frames first
        frames.forEach((src, idx) => {
          const img = new Image();
          img.onload = () => {
            preloadedImages[idx] = img;
            loadedCount++;
            if (loadedCount === totalFrames) {
              // All frames loaded, hide spinner and start animation
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
            // Draw the current frame
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(preloadedImages[currentIndex], 0, 0, width, height);

            // Advance to next frame
            currentIndex = (currentIndex + 1) % totalFrames;
            lastTimestamp = timestamp;
          }

          requestAnimationFrame(animate);
        }
      });