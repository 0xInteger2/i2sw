document.addEventListener('DOMContentLoaded', () => {
  const rightContent = document.getElementById('rightContent');
  const images = Array.from(rightContent.querySelectorAll('img'));

  // Duplicate content for seamless scrolling
  rightContent.innerHTML += rightContent.innerHTML;

  // Preload all images (show once loaded)
  const allImages = Array.from(rightContent.querySelectorAll('img'));
  allImages.forEach(img => {
    const tmp = new Image();
    tmp.src = img.src;
    tmp.onload = () => {
      img.style.visibility = 'visible';
    };
  });

  let scrollPos = 0;
  let displayPos = 0;
  const baseSpeed = 1;
  let velocity = baseSpeed;
  let isDragging = false;
  let startPos = 0;
  let dragStartScroll = 0;
  const friction = 0.95;

  // For swipe momentum tracking
  let lastTouchTime = 0;
  let lastTouchPos = 0;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function isHorizontal() {
    return window.innerWidth <= 1080;
  }

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

  // Mouse wheel scroll
  rightContent.addEventListener('wheel', e => {
    e.preventDefault();
    scrollPos += e.deltaY;
  });

  // Touch drag start
  rightContent.addEventListener('touchstart', e => {
    isDragging = true;
    startPos = isHorizontal() ? e.touches[0].clientX : e.touches[0].clientY;
    dragStartScroll = scrollPos;
    velocity = 0;
    lastTouchTime = Date.now();
    lastTouchPos = startPos;
  });

  // Touch move
  rightContent.addEventListener('touchmove', e => {
    if (!isDragging) return;
    const currentPos = isHorizontal() ? e.touches[0].clientX : e.touches[0].clientY;
    const delta = startPos - currentPos;
    scrollPos = dragStartScroll + delta;

    // Track velocity while dragging
    const now = Date.now();
    const dt = now - lastTouchTime;
    if (dt > 0) {
      velocity = (lastTouchPos - currentPos) / dt * 20; // scale factor
      lastTouchTime = now;
      lastTouchPos = currentPos;
    }
  });

  // Touch end
  rightContent.addEventListener('touchend', () => {
    isDragging = false;
    if (Math.abs(velocity) < baseSpeed) velocity = baseSpeed;
  });

  // Hover pause on desktop
  rightContent.addEventListener('mouseenter', () => isDragging = true);
  rightContent.addEventListener('mouseleave', () => isDragging = false);

  // Reset scroll on resize
  window.addEventListener('resize', () => {
    scrollPos = displayPos = 0;
  });

  // Animation loop
  function animate() {
    if (!isDragging) {
      velocity *= friction;
      if (Math.abs(velocity) < baseSpeed) velocity = baseSpeed;
      scrollPos += velocity;
    }

    displayPos = lerp(displayPos, scrollPos, 0.1);
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
