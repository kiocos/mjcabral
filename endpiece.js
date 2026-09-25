(() => {
  const ornament = document.querySelector(".endpiece");
  const canvas = ornament?.querySelector("canvas");
  const context = canvas?.getContext("2d");
  if (!context) return;

  // Fixed lighting and ordered dithering; only the whole sphere floats.
  const bayer = [
     0, 48, 12, 60,  3, 51, 15, 63,
    32, 16, 44, 28, 35, 19, 47, 31,
     8, 56,  4, 52, 11, 59,  7, 55,
    40, 24, 36, 20, 43, 27, 39, 23,
     2, 50, 14, 62,  1, 49, 13, 61,
    34, 18, 46, 30, 33, 17, 45, 29,
    10, 58,  6, 54,  9, 57,  5, 53,
    42, 26, 38, 22, 41, 25, 37, 21,
  ];
  const ink = [40, 40, 40];
  const highlight = [220, 210, 190];
  const shadow = [28, 27, 24];
  const { width, height } = canvas;
  const frame = context.createImageData(width, height);
  const radius = 22;
  const surface = [];

  // Keep the silhouette, lighting, and surface texture fixed.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = (x + 0.5 - width / 2) / radius;
      const ny = (y + 0.5 - height / 2) / radius;
      const depth = 1 - nx * nx - ny * ny;
      if (depth <= 0) continue;
      const nz = Math.sqrt(depth);
      const light = Math.max(0, -nx * 0.4 - ny * 0.5 + nz * 0.76);
      surface.push({
        index: y * width + x,
        x: nx,
        y: ny * 0.976 - nz * 0.218,
        z: ny * 0.218 + nz * 0.976,
        shade: 0.16 + (1 - light) * 0.8,
        overheadLight: Math.max(0, -nx * 0.48 - ny * 0.66 + nz * 0.58),
        threshold: (bayer[(y % 8) * 8 + x % 8] + 0.5) / 64,
      });
    }
  }

  function draw() {
    const dark = document.documentElement.dataset.theme === "dark";
    const data = frame.data;
    data.fill(0);

    for (const point of surface) {
      const { x, z } = point;
      // Subtle variations give the still surface some depth.
      const grain = Math.sin(x * 5 + Math.sin(z * 4 + point.y * 2))
        * Math.cos(point.y * 5 - z * 3);
      let color = ink;
      if (dark) {
        // A bright upper-left face falls into a soft charcoal shadow.
        const light = Math.max(0, (point.overheadLight - 0.12) / 0.88);
        const density = Math.pow(light, 1.65) * (0.88 + grain * 0.1);
        color = density > point.threshold ? highlight : shadow;
      } else if (point.shade + grain * 0.17 <= point.threshold) continue;
      const offset = point.index * 4;
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = 255;
    }

    context.putImageData(frame, 0, 0);
  }

  function float(seconds) {
    // Move the complete pixel pattern smoothly, without a ripple or shadow.
    canvas.style.transform = `translateY(${-Math.sin(seconds * Math.PI * 2 / 8) * 4}px)`;
  }

  draw();
  new MutationObserver(draw).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  float(0);
  ornament.classList.add("is-ready");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let elapsed = 0;
  let previous = null;
  let request = 0;
  let visible = false;

  function tick(now) {
    request = 0;
    if (previous !== null) elapsed += now - previous;
    previous = now;
    float(elapsed / 1000);
    request = requestAnimationFrame(tick);
  }

  function sync() {
    cancelAnimationFrame(request);
    request = 0;
    previous = null;
    if (reducedMotion.matches) float(0);
    else if (visible && !document.hidden) request = requestAnimationFrame(tick);
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.35;
      sync();
    }, { threshold: 0.35 }).observe(ornament);
  }
  document.addEventListener("visibilitychange", sync);
  reducedMotion.addEventListener("change", sync);
})();
