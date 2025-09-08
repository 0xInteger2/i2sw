document.addEventListener('DOMContentLoaded', () => {
  const rightContent = document.getElementById('rightContent');

  // Clone existing items instead of innerHTML
  const originalNodes = Array.from(rightContent.children);
  originalNodes.forEach(node => {
    const clone = node.cloneNode(true);
    rightContent.appendChild(clone);
  });

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

  const isHorizontal = () => window.innerWidth <= 1079;
  const lerp = (a, b, t) => a + (b - a) * t;

  const loopScroll = () => {
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
  };

  // Wheel scrolling
  rightContent.addEventListener('wheel', e => {
    e.preventDefault();
    velocity += e.deltaY * 0.25;
  });

  // Touch events
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

    if (!draggingAxis && Math.sqrt(dx*dx + dy*dy) > 10) {
      draggingAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }

    if (draggingAxis === 'x' && isHorizontal()) {
      e.preventDefault(); // prevent horizontal scroll interference
      if (!isDragging) {
        isDragging = true;
        dragStartScroll = scrollPos;
      }
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
  });

  rightContent.addEventListener('touchend', () => {
    isDragging = false;
    draggingAxis = null;
    if (Math.abs(velocity) < baseSpeed) velocity = baseSpeed;
  });

  function animate() {
    if (!isDragging) {
      velocity *= friction;
      if (Math.abs(velocity) < baseSpeed) velocity = baseSpeed;
      scrollPos += velocity;
    } else {
      displayPos = scrollPos;
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
