document.addEventListener('DOMContentLoaded', () => {
  const rightContent = document.getElementById('rightContent');
  const originalContent = rightContent.innerHTML;

  // Duplicate content for infinite scroll
  rightContent.innerHTML += originalContent;

  // Preload images
  Array.from(rightContent.querySelectorAll('img')).forEach(img => {
    const tmp = new Image();
    tmp.src = img.src;
    tmp.onload = () => { img.style.visibility = 'visible'; };
  });

  let scrollPos = 0, displayPos = 0;
  const baseSpeed = 0.5;
  let velocity = baseSpeed;
  const friction = 0.95;
  const maxVelocity = 150;
  const velocityBoost = 45;

  let isDragging = false;
  let draggingAxis = null;
  let startX = 0, startY = 0;
  let dragStartScroll = 0;
  let lastTouchTime = 0;
  let lastTouchPos = 0;

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

  rightContent.addEventListener('wheel', e => {
    e.preventDefault();
    velocity += e.deltaY * 0.25;
  });

  rightContent.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    draggingAxis = null;
    isDragging = false;
    velocity = 0;
    lastTouchTime = Date.now();
    lastTouchPos = startX;
  });

  rightContent.addEventListener('touchmove', e => {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - startX;
    const dy = currentY - startY;

    // Determine axis only after small movement
    if (!draggingAxis && Math.sqrt(dx*dx + dy*dy) > 10) {
      draggingAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }

    // Horizontal swipe must exceed threshold (100px) to start carousel drag
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
    // Vertical swipe does nothing → allows natural scrolling
  });

  rightContent.addEventListener('touchend', () => {
    isDragging = false;
    draggingAxis = null;
    if (Math.abs(velocity) < baseSpeed) velocity = baseSpeed;
  });

  window.addEventListener('resize', () => { scrollPos = displayPos = 0; });

  function animate() {
    if (!isDragging) {
      velocity *= friction;
      if (Math.abs(velocity) < baseSpeed) velocity = baseSpeed;
      scrollPos += velocity;
    } else {
      displayPos = scrollPos; // follow finger exactly
    }

    displayPos = lerp(displayPos, scrollPos, 0.12);
    loopScroll();

    rightContent.style.transform = isHorizontal()
      ? `translateX(-${displayPos}px)`
      : `translateY(-${displayPos}px)`;

    requestAnimationFrame(animate);
  }

  animate();
});
