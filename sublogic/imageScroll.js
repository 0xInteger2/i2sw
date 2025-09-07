document.addEventListener('DOMContentLoaded', () => {
  const rightContent = document.getElementById('rightContent');
  rightContent.innerHTML += rightContent.innerHTML; // duplicate for infinite

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
  let draggingAxis = null; // 'x' or 'y'

  const friction = 0.92;
  const deadzone = 25;     // bigger → avoids hijacking vertical scroll
  const maxVelocity = 80;  // allow faster flicks
  const velocityBoost = 45; // scaling factor for swipe speed

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

  // Wheel adds momentum
  rightContent.addEventListener('wheel', e => {
    e.preventDefault();
    velocity += e.deltaY * 0.25; // slightly stronger
  });

  // Touch drag
  rightContent.addEventListener('touchstart', e => {
    isDragging = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    dragStartScroll = scrollPos;
    velocity = 0;
    lastTouchTime = Date.now();
    lastTouchPos = isHorizontal() ? startX : startY;
    draggingAxis = null;
  });

  rightContent.addEventListener('touchmove', e => {
    if (!isDragging) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;

    // Detect axis after deadzone
    if (!draggingAxis) {
      const dx = currentX - startX;
      const dy = currentY - startY;
      if (Math.abs(dx) > deadzone || Math.abs(dy) > deadzone) {
        draggingAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      } else {
        return; // ignore tiny moves
      }
    }

    // If swipe axis matches carousel → prevent page scroll
    if ((isHorizontal() && draggingAxis === 'x') ||
        (!isHorizontal() && draggingAxis === 'y')) {
      e.preventDefault();

      const currentPos = isHorizontal() ? currentX : currentY;
      const delta = (isHorizontal() ? startX - currentX : startY - currentY);
      scrollPos = dragStartScroll + delta;

      // Track velocity
      const now = Date.now();
      const dt = now - lastTouchTime;
      if (dt > 0) {
        velocity = ((lastTouchPos - currentPos) / dt) * velocityBoost;
        velocity = Math.max(Math.min(velocity, maxVelocity), -maxVelocity);
        lastTouchTime = now;
        lastTouchPos = currentPos;
      }
    } else {
      // Let browser scroll page naturally
      isDragging = false;
      draggingAxis = null;
    }
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

    if (isHorizontal()) {
      rightContent.style.transform = `translateX(-${displayPos}px)`;
    } else {
      rightContent.style.transform = `translateY(-${displayPos}px)`;
    }

    requestAnimationFrame(animate);
  }

  animate();
});
