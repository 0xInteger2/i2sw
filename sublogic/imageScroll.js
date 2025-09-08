document.addEventListener('DOMContentLoaded', () => {
  const rightContent = document.getElementById('rightContent');
  const originalContent = rightContent.innerHTML;

  // Duplicate content for infinite scroll
  rightContent.innerHTML += originalContent;

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
  let draggingAxis = null;
  let startX = 0, startY = 0, dragStartScroll = 0;

  const friction = 0.95;
  const maxVelocity = 150;
  const velocityBoost = 45;
  let lastTouchTime = 0, lastTouchPos = 0;

  function isHorizontal() { return window.innerWidth <= 1080; }
  function lerp(a, b, t) { return a + (b - a) * t; }

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

  // Wheel scroll (desktop)
  rightContent.addEventListener('wheel', e => {
    e.preventDefault();
    velocity += e.deltaY * 0.25;
  });

  // Touch gestures
  rightContent.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isDragging = false;
    draggingAxis = null;
    velocity = 0;
    lastTouchTime = Date.now();
    lastTouchPos = startX;
  });

  rightContent.addEventListener('touchmove', e => {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - startX;
    const dy = currentY - startY;

    // Determine axis after small movement
    if (!draggingAxis && Math.sqrt(dx*dx + dy*dy) > 5) {
      draggingAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }

    // Only activate horizontal carousel after a heavy sideways swipe
    if (draggingAxis === 'x' && isHorizontal() && Math.abs(dx) > 100) {
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
    // Vertical movement passes through naturally
  });

  rightContent.addEventListener('touchend', () => {
    isDragging = false;
    draggingAxis = null;
    if (Math.abs(velocity) < baseSpeed) velocity = baseSpeed;
  });

  // Reset scroll on resize
  window.addEventListener('resize', () => {
    scrollPos = displayPos = 0;
  });

  // Animate loop
  function animate() {
    if (!isDragging) {
      velocity *= friction;
      if (Math.abs(velocity) < baseSpeed) velocity = baseSpeed;
      scrollPos += velocity;
      displayPos = lerp(displayPos, scrollPos, 0.12);
      loopScroll();
    } else {
      // while dragging, follow finger exactly
      displayPos = scrollPos;
    }

    if (isHorizontal()) {
      rightContent.style.transform = `translateX(-${displayPos}px)`;
    } else {
      rightContent.style.transform = `translateY(-${displayPos}px)`;
    }

    requestAnimationFrame(animate);
  }

  animate();
});
