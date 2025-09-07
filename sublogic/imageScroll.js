document.addEventListener('DOMContentLoaded', () => {
  const rightContent = document.getElementById('rightContent');

  // Duplicate content for seamless infinite scroll
  rightContent.innerHTML += rightContent.innerHTML;

  let scrollPos = 0;      // target scroll position
  let displayPos = 0;     // rendered scroll position
  const baseSpeed = 1;    // normal auto-scroll speed
  let velocity = baseSpeed;
  let isDragging = false;
  let startY = 0;
  let scrollStart = 0;

  const friction = 0.95; // slows auto-scroll gradually

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function loopScroll() {
    const halfHeight = rightContent.scrollHeight / 2;

    // When displayPos gets beyond halfHeight, wrap smoothly
    if (displayPos >= halfHeight) {
      displayPos -= halfHeight;
      scrollPos -= halfHeight;
    } else if (displayPos < 0) {
      displayPos += halfHeight;
      scrollPos += halfHeight;
    }
  }

  // Mouse wheel: instant scroll
  rightContent.addEventListener('wheel', (e) => {
    e.preventDefault();
    scrollPos += e.deltaY;
  });

  // Touch drag
  rightContent.addEventListener('touchstart', (e) => {
    isDragging = true;
    startY = e.touches[0].clientY;
    scrollStart = scrollPos;
  });

  rightContent.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const delta = startY - e.touches[0].clientY;
    scrollPos = scrollStart + delta;
  });

  rightContent.addEventListener('touchend', () => {
    isDragging = false;
  });

  rightContent.addEventListener('mouseenter', () => isDragging = true);
  rightContent.addEventListener('mouseleave', () => isDragging = false);

  function animate() {
    if (!isDragging) {
      velocity *= friction;
      if (Math.abs(velocity) < baseSpeed) velocity = baseSpeed;
      scrollPos += velocity;
    }

    // Smooth interpolation
    displayPos = lerp(displayPos, scrollPos, 0.1);
    
    loopScroll();

    rightContent.style.transform = `translateY(-${displayPos}px)`;
    requestAnimationFrame(animate);
  }

  animate();
});
