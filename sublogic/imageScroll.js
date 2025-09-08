document.addEventListener('DOMContentLoaded', () => {
  const rightContent = document.getElementById('rightContent');
  rightContent.innerHTML += rightContent.innerHTML; // duplicate for infinite

  // Preload images
  Array.from(rightContent.querySelectorAll('img')).forEach(img => {
    const tmp = new Image();
    tmp.src = img.src;
    tmp.onload = () => { img.style.visibility = 'visible'; };
  });

  let scrollPos = 0, displayPos = 0;
  const baseSpeed = 0.5;
  let velocity = baseSpeed;
  let isDragging = false;
  let startX = 0, startY = 0, dragStartScroll = 0, draggingAxis = null;

  const friction = 0.95;
  const maxVelocity = 150;
  const velocityBoost = 45;

  let lastTouchTime = 0, lastTouchPos = 0;

  function lerp(a, b, t) { return a + (b - a) * t; }
  function isHorizontal() { return window.innerWidth <= 1080; }

  function loopScroll() {
    const totalLength = isHorizontal()
      ? rightContent.scrollWidth / 2
      : rightContent.scrollHeight / 2;

    if (displayPos >= totalLength) {
      displayPos -= totalLength;
      scrollPos -= totalLength;
    } else if (displayPos < 0) {
      displayPos += totalLength;
      scrollPos += totalLength;
    }
  }

  // Wheel scroll – only desktop horizontal
  rightContent.addEventListener('wheel', e => {
    if (isHorizontal()) {
      e.preventDefault();
      velocity += e.deltaY * 0.25;
    }
  });

  // Touch gestures – only horizontal swipes
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

    // Determine axis only after small movement
    if (!draggingAxis && Math.sqrt(dx*dx + dy*dy) > 5) {
      draggingAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }

    // Only handle horizontal swipes
    if (draggingAxis === 'x') {
      e.preventDefault(); // stop page scroll
      scrollPos = dragStartScroll - dx;

      // Track velocity
      const now = Date.now();
      const dt = now - lastTouchTime;
      if (dt > 0) {
        velocity = ((lastTouchPos - currentX) / dt) * velocityBoost;
        velocity = Math.max(Math.min(velocity, maxVelocity), -maxVelocity);
        lastTouchTime = now;
        lastTouchPos = currentX;
      }
    }
    // Vertical swipes → do NOT touch scrollPos, let page scroll naturally
  });

  rightContent.addEventListener('touchend', () => {
    isDragging = false;
    draggingAxis = null;
    if (Math.abs(velocity) < baseSpeed) velocity = baseSpeed;
  });

  window.addEventListener('resize', () => { scrollPos = displayPos = 0; });

  function animate() {
    // Only animate horizontal carousel when not dragging vertically
    if (!isDragging || draggingAxis === 'x') {
      velocity *= friction;
      if (Math.abs(velocity) < baseSpeed) velocity = baseSpeed;
      scrollPos += velocity;
    }

    displayPos = lerp(displayPos, scrollPos, 0.12);
    loopScroll();

    if (isHorizontal()) {
      rightContent.style.transform = `translateX(-${displayPos}px)`;
    } else {
      rightContent.style.transform = `translateY(-${displayPos}px)`;
    }

    requestAnimationFrame(animate);
  }

  animate();
});
