document.addEventListener('DOMContentLoaded', () => {
  const rightContent = document.getElementById('rightContent');
  const originalContent = rightContent.innerHTML;

  // Duplicate for infinite scroll
  rightContent.innerHTML += originalContent;

  // Preload images
  Array.from(rightContent.querySelectorAll('img')).forEach(img => {
    const tmp = new Image();
    tmp.src = img.src;
    tmp.onload = () => { img.style.visibility = 'visible'; };
  });

  // Positions
  let scrollPosX = 0, displayPosX = 0;
  let scrollPosY = 0, displayPosY = 0;
  const baseSpeed = 0.5;
  let velocityX = baseSpeed, velocityY = baseSpeed;
  const friction = 0.95;
  const maxVelocity = 150;
  const velocityBoost = 45;

  // Touch tracking
  let isDragging = false;
  let draggingAxis = null;
  let hasStartedHorizontalDrag = false;
  let startX = 0, startY = 0;
  let dragStartScrollX = 0, dragStartScrollY = 0;
  let lastTouchTime = 0, lastTouchPos = 0;

  function isHorizontal() { return window.innerWidth <= 1080; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function loopScrollX() {
    const totalLength = rightContent.scrollWidth / 2;
    if (displayPosX >= totalLength) { displayPosX -= totalLength; scrollPosX -= totalLength; }
    else if (displayPosX < 0) { displayPosX += totalLength; scrollPosX += totalLength; }
  }

  function loopScrollY() {
    const totalLength = rightContent.scrollHeight / 2;
    if (displayPosY >= totalLength) { displayPosY -= totalLength; scrollPosY -= totalLength; }
    else if (displayPosY < 0) { displayPosY += totalLength; scrollPosY += totalLength; }
  }

  // Wheel scroll
  rightContent.addEventListener('wheel', e => {
    e.preventDefault();
    if (isHorizontal()) velocityX += e.deltaY * 0.25;
    else velocityY += e.deltaY * 0.25;
  });

  // Touch gestures
  rightContent.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    draggingAxis = null;
    isDragging = false;
    hasStartedHorizontalDrag = false;
    velocityX = velocityY = 0;
    lastTouchTime = Date.now();
    lastTouchPos = isHorizontal() ? startX : startY;
  });

  rightContent.addEventListener('touchmove', e => {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - startX;
    const dy = currentY - startY;

    // Determine swipe axis after small movement
    if (!draggingAxis && Math.sqrt(dx*dx + dy*dy) > 5) {
      draggingAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }

    // Only start horizontal drag after threshold
    if (draggingAxis === 'x' && isHorizontal()) {
      if (!hasStartedHorizontalDrag && Math.abs(dx) > 30) {
        hasStartedHorizontalDrag = true;
        isDragging = true;
        dragStartScrollX = scrollPosX;
      }

      if (hasStartedHorizontalDrag) {
        e.preventDefault();
        scrollPosX = dragStartScrollX - dx;
        const now = Date.now();
        const dt = now - lastTouchTime;
        if (dt > 0) {
          velocityX = ((lastTouchPos - currentX) / dt) * velocityBoost;
          velocityX = Math.max(Math.min(velocityX, maxVelocity), -maxVelocity);
          lastTouchTime = now;
          lastTouchPos = currentX;
        }
      }
    }

    // Vertical drag on desktop
    if (draggingAxis === 'y' && !isHorizontal()) {
      if (!isDragging) {
        isDragging = true;
        dragStartScrollY = scrollPosY;
      }
      scrollPosY = dragStartScrollY - dy;
      const now = Date.now();
      const dt = now - lastTouchTime;
      if (dt > 0) {
        velocityY = ((lastTouchPos - currentY) / dt) * velocityBoost;
        velocityY = Math.max(Math.min(velocityY, maxVelocity), -maxVelocity);
        lastTouchTime = now;
        lastTouchPos = currentY;
      }
    }
  });

  rightContent.addEventListener('touchend', () => {
    isDragging = false;
    draggingAxis = null;
    hasStartedHorizontalDrag = false;
    if (Math.abs(velocityX) < baseSpeed) velocityX = baseSpeed;
    if (Math.abs(velocityY) < baseSpeed) velocityY = baseSpeed;
  });

  // Resize reset
  window.addEventListener('resize', () => {
    scrollPosX = displayPosX = 0;
    scrollPosY = displayPosY = 0;
  });

  // Animate loop
  function animate() {
    if (!isDragging) {
      if (isHorizontal()) {
        velocityX *= friction;
        if (Math.abs(velocityX) < baseSpeed) velocityX = baseSpeed;
        scrollPosX += velocityX;
        displayPosX = lerp(displayPosX, scrollPosX, 0.12);
        loopScrollX();
      } else {
        velocityY *= friction;
        if (Math.abs(velocityY) < baseSpeed) velocityY = baseSpeed;
        scrollPosY += velocityY;
        displayPosY = lerp(displayPosY, scrollPosY, 0.12);
        loopScrollY();
      }
    } else {
      if (draggingAxis === 'x') displayPosX = scrollPosX;
      if (draggingAxis === 'y') displayPosY = scrollPosY;
    }

    rightContent.style.transform = isHorizontal()
      ? `translateX(-${displayPosX}px)`
      : `translateY(-${displayPosY}px)`;

    requestAnimationFrame(animate);
  }

  animate();
});
