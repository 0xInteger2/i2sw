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
  let startX = 0, dragStartScroll = 0;

  const friction = .95;
  const deadzone = 400;     // ignore small moves
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

  // Desktop wheel scroll
  rightContent.addEventListener('wheel', e => {
    e.preventDefault();
    velocity += e.deltaY * 0.25;
  });

  // Touch gestures (only active in horizontal mode)
  rightContent.addEventListener('touchstart', e => {
    if (!isHorizontal()) return; // disable touch in vertical mode

    isDragging = true;
    startX = e.touches[0].clientX;
    dragStartScroll = scrollPos;
    velocity = 0;
    lastTouchTime = Date.now();
    lastTouchPos = startX;
  });

  rightContent.addEventListener('touchmove', e => {
    if (!isDragging || !isHorizontal()) return;

    const currentX = e.touches[0].clientX;
    const dx = currentX - startX;

    // only act if swipe is clearly horizontal
    if (Math.abs(dx) > deadzone) {
      e.preventDefault();

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
  });

  rightContent.addEventListener('touchend', () => {
    isDragging = false;
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
