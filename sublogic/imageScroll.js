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

  // Wheel scroll
  rightContent.addEventListener('wheel', e => {
    e.preventDefault();
    velocity += e.deltaY * 0.25;
  });

  // Touch gestures
  rightContent.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isDragging = false; // only activated after axis determined
    draggingAxis = null;
    velocity = 0;
    lastTouchTime = Date.now();
    lastTouchPos = isHorizontal() ? startX : startY;
  });

  rightContent.addEventListener('touchmove', e => {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - startX;
    const dy = currentY - startY;

    // Determine drag axis after slight movement
    if (!draggingAxis && Math.sqrt(dx*dx + dy*dy) > 5) {
      draggingAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if ((draggingAxis === 'x' && isHorizontal()) || draggingAxis === 'y') {
        isDragging = true;
        dragStartScroll = scrollPos;
      }
    }

    if (isDragging) {
      e.preventDefault();
      if (draggingAxis === 'x' && isHorizontal()) {
        scrollPos = dragStartScroll - dx;
        const now = Date.now();
        const dt = now - lastTouchTime;
        if (dt > 0) {
          velocity = ((lastTouchPos - currentX) / dt) * velocityBoost;
          velocity = Math.max(Math.min(velocity, maxVelocity), -maxVelocity);
          lastTouchTime = now;
          lastTouchPos = currentX;
        }
      } else if (draggingAxis === 'y' && !isHorizontal()) {
        scrollPos = dragStartScroll - dy;
        const now = Date.now();
        const dt = now - lastTouchTime;
        if (dt > 0) {
          velocity = ((lastTouchPos - currentY) / dt) * velocityBoost;
          velocity = Math.max(Math.min(velocity, maxVelocity), -maxVelocity);
          lastTouchTime = now;
          lastTouchPos = currentY;
        }
      }
    }
  });

  rightContent.addEventListener('touchend', () => {
    isDragging = false;
    draggingAxis = null;
    if (Math.abs(velocity) < baseSpeed) velocity = baseSpeed;
  });

  // Resize resets
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
      // follow finger exactly while dragging
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
