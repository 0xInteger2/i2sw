document.addEventListener('DOMContentLoaded', () => {
  const rightContent = document.getElementById('rightContent');
  rightContent.innerHTML += rightContent.innerHTML; // duplicate only for horizontal

  // Preload images
  const allImages = Array.from(rightContent.querySelectorAll('img'));
  allImages.forEach(img => {
    const tmp = new Image();
    tmp.src = img.src;
    tmp.onload = () => { img.style.visibility = 'visible'; };
  });

  let scrollPos = 0, displayPos = 0;
  const baseSpeed = 0.5;
  let velocity = baseSpeed;
  let isDragging = false;
  let startX = 0, startY = 0, dragStartScroll = 0;
  let draggingAxis = null;

  const friction = 0.92;
  const velocityBoost = 45;
  const maxVelocity = 150;

  let lastTouchTime = 0, lastTouchPos = 0;

  function lerp(a, b, t) { return a + (b - a) * t; }
  function isHorizontal() { return window.innerWidth <= 1080; }

  function loopScroll() {
    const totalLength = rightContent.scrollWidth / 2;
    if (displayPos >= totalLength) {
      displayPos -= totalLength;
      scrollPos -= totalLength;
    } else if (displayPos < 0) {
      displayPos += totalLength;
      scrollPos += totalLength;
    }
  }

  // Desktop wheel scroll only on horizontal mode
  rightContent.addEventListener('wheel', e => {
    if (!isHorizontal()) return; // disable on desktop vertical
    e.preventDefault();
    velocity += e.deltaY * 0.25;
  });

  // Touch gestures
  rightContent.addEventListener('touchstart', e => {
    if (!isHorizontal()) return;

    isDragging = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    dragStartScroll = scrollPos;
    velocity = 0;
    draggingAxis = null;
    lastTouchTime = Date.now();
    lastTouchPos = startX;
  });

  rightContent.addEventListener('touchmove', e => {
    if (!isDragging || !isHorizontal()) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - startX;
    const dy = currentY - startY;

    // Determine swipe axis after small movement
    if (!draggingAxis && Math.sqrt(dx*dx + dy*dy) > 5) {
      draggingAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }

    if (draggingAxis === 'x') {
      e.preventDefault(); // block vertical page scroll
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
    // Vertical swipes pass through naturally
  });

  rightContent.addEventListener('touchend', () => {
    isDragging = false;
    draggingAxis = null;
    if (Math.abs(velocity) < baseSpeed) velocity = baseSpeed;
  });

  // Animate loop
  function animate() {
    if (!isDragging && isHorizontal()) {
      velocity *= friction;
      if (Math.abs(velocity) < baseSpeed) velocity = baseSpeed;
      scrollPos += velocity;
    }

    displayPos = lerp(displayPos, scrollPos, 0.12);
    if (isHorizontal()) loopScroll();

    if (isHorizontal()) {
      rightContent.style.transform = `translateX(-${displayPos}px)`;
    } else {
      rightContent.style.transform = `translateY(0)`; // vertical scroll controlled by browser
    }

    requestAnimationFrame(animate);
  }

  animate();
});
