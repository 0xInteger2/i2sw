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
  // Only handle first finger and touches starting inside rightContent
  if (!isHorizontal() || e.target.closest('#rightContent') === null) return;

  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
  isDragging = false;      // only set to true after horizontal confirmed
  draggingAxis = null;
  velocity = 0;
  lastTouchTime = Date.now();
  lastTouchPos = startX;
});

rightContent.addEventListener('touchmove', e => {
  if (!isHorizontal()) return;

  const currentX = e.touches[0].clientX;
  const currentY = e.touches[0].clientY;
  const dx = currentX - startX;
  const dy = currentY - startY;

  // Only detect axis after small movement
  if (!draggingAxis && Math.sqrt(dx*dx + dy*dy) > 5) {
    draggingAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (draggingAxis === 'x') {
      isDragging = true;
      dragStartScroll = scrollPos; // only set here
    }
  }

  // Only act for horizontal swipes
  if (draggingAxis === 'x' && isDragging) {
    e.preventDefault();
    const delta = currentX - startX;
    scrollPos = dragStartScroll - delta;

    const now = Date.now();
    const dt = now - lastTouchTime;
    if (dt > 0) {
      velocity = ((lastTouchPos - currentX) / dt) * 45;
      velocity = Math.max(Math.min(velocity, 150), -150);
      lastTouchTime = now;
      lastTouchPos = currentX;
    }
  }
  // vertical swipes are ignored → allow page scroll
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
