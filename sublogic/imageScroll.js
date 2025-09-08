document.addEventListener('DOMContentLoaded', () => {
  const rightContent = document.getElementById('rightContent');
  const originalHTML = rightContent.innerHTML;
  rightContent.innerHTML += originalHTML; // duplicate for infinite loop

  // Preload images and wait for all to load
  const images = Array.from(rightContent.querySelectorAll('img'));
  let loadedImages = 0;
  images.forEach(img => {
    const tmp = new Image();
    tmp.src = img.src;
    tmp.onload = () => {
      img.style.visibility = 'visible';
      loadedImages++;
    };
  });

  function isMobile() { return window.innerWidth <= 1080; }

  // Scroll positions & velocities
  let scrollPos = 0, displayPos = 0;
  const baseSpeed = 0.5;
  let velocity = baseSpeed;
  const friction = 0.95;
  const maxVelocity = 150;
  const velocityBoost = 45;

  // Dragging
  let isDragging = false;
  let draggingAxis = null;
  let startX = 0, startY = 0;
  let dragStartScroll = 0;
  let lastTouchTime = 0, lastTouchPos = 0;

  // Lerp helper
  function lerp(a, b, t) { return a + (b - a) * t; }

  // Loop scroll helper
  function loopScroll() {
    const totalLength = isMobile() ? rightContent.scrollWidth / 2 : rightContent.scrollHeight / 2;
    if (displayPos >= totalLength) {
      displayPos -= totalLength;
      scrollPos -= totalLength;
    } else if (displayPos < 0) {
      displayPos += totalLength;
      scrollPos += totalLength;
    }
  }

  // Wheel scroll
  rightContent.addEventListener('wheel', e => {
    e.preventDefault();
    velocity += e.deltaY * 0.25;
  });

  // Touch gestures
  rightContent.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    draggingAxis = null;
    isDragging = false;
    velocity = 0;
    lastTouchTime = Date.now();
    lastTouchPos = isMobile() ? startX : startY;
  });

  rightContent.addEventListener('touchmove', e => {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - startX;
    const dy = currentY - startY;

    // Determine drag axis only after some movement
    if (!draggingAxis && Math.sqrt(dx*dx + dy*dy) > 10) {
      draggingAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }

    // Only start carousel dragging on **strong horizontal swipe**
    if (draggingAxis === 'x' && isMobile() && Math.abs(dx) > 30) {
      if (!isDragging) {
        isDragging = true;
        dragStartScroll = scrollPos;
      }
      e.preventDefault();
      scrollPos = dragStartScroll - dx;

      const now = Date.now();
      const dt = now - lastTouchTime;
      if (dt > 0) {
        velocity = ((lastTouchPos - currentX) / dt) * velocityBoost;
        velocity = Math.max(Math.min(velocity, maxVelocity), -maxVelocity);
        lastTouchTime = now;
        lastTouchPos = currentX;
      }
    }

    // Vertical swipes do nothing → natural page scroll
  });

  rightContent.addEventListener('touchend', () => {
    isDragging = false;
    draggingAxis = null;
    if (Math.abs(velocity) < baseSpeed) velocity = baseSpeed;
  });

  // Resize resets
  window.addEventListener('resize', () => { scrollPos = displayPos = 0; });

  // Animate loop
  function animate() {
    if (!isDragging) {
      velocity *= friction;
      if (Math.abs(velocity) < baseSpeed) velocity = baseSpeed;
      scrollPos += velocity;
    }

    displayPos = lerp(displayPos, scrollPos, 0.12);
    loopScroll();

    if (isMobile()) {
      rightContent.style.transform = `translateX(-${displayPos}px)`;
    } else {
      rightContent.style.transform = `translateY(-${displayPos}px)`;
    }

    requestAnimationFrame(animate);
  }

  // Wait until all images are loaded
  const checkImagesLoaded = setInterval(() => {
    if (loadedImages === images.length) {
      clearInterval(checkImagesLoaded);
      animate();
    }
  }, 50);
});
