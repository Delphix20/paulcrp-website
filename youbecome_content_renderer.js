"use strict";

(() => {
  const FEED_WIDTH = 1080;
  const FEED_HEIGHT = 1350;
  const STORY_WIDTH = 1080;
  const STORY_HEIGHT = 1920;
  const JPEG_QUALITY = 0.94;
  const RENDERER_VERSION = "20260827-4";

  const categoryPhrases = {
    assertiveness: "more assertive.",
    assertive: "more assertive.",
    authenticity: "more authentic.",
    balance: "more balanced.",
    balanced: "more balanced.",
    calm: "calmer.",
    calmer: "calmer.",
    compassion: "more compassionate.",
    confidence: "more confident.",
    confident: "more confident.",
    connection: "more connected.",
    courage: "more courageous.",
    creativity: "more creative.",
    decisiveness: "more decisive.",
    discipline: "more disciplined.",
    disciplined: "more disciplined.",
    focus: "more focused.",
    focused: "more focused.",
    gratitude: "more grateful.",
    grateful: "more grateful.",
    growth: "open to growth.",
    intentional: "open to growth.",
    "open-to-growth": "open to growth.",
    open_to_growth: "open to growth.",
    joy: "more joyful.",
    motivation: "more motivated.",
    motivated: "more motivated.",
    optimism: "more optimistic.",
    optimistic: "more optimistic.",
    organization: "more organized.",
    patience: "more patient.",
    patient: "more patient.",
    presence: "more present.",
    present: "more present.",
    purpose: "more purposeful.",
    resilience: "more resilient.",
    resilient: "more resilient.",
    "self-awareness": "more self-aware.",
    "self-kindness": "kinder to myself.",
    "kinder-to-myself": "kinder to myself.",
    kinder_to_myself: "kinder to myself.",
    "social-ease": "more at ease with others."
  };

  function hexRGB(value) {
    const hex = String(value || "#23212c").replace("#", "");
    return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  }

  function rgba(value, alpha) {
    const [red, green, blue] = hexRGB(value);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  function mix(left, right, amount) {
    const a = hexRGB(left);
    const b = hexRGB(right);
    const values = a.map((value, index) => Math.round(value + ((b[index] - value) * amount)));
    return `rgb(${values[0]}, ${values[1]}, ${values[2]})`;
  }

  function contrastText(background) {
    const channels = hexRGB(background).map((value) => {
      const normalized = value / 255;
      return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    return luminance > 0.34 ? "#23212c" : "#f7f4ec";
  }

  function drawBackground(ctx, width, height, colors) {
    const [top, bottom, lightText] = colors;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, mix(top, bottom, 0.04));
    gradient.addColorStop(0.3, mix(top, bottom, 0.16));
    gradient.addColorStop(0.52, mix(top, bottom, 0.42));
    gradient.addColorStop(0.74, mix(top, bottom, 0.72));
    gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const wash = ctx.createLinearGradient(0, 0, width, height);
    wash.addColorStop(0, lightText ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.12)");
    wash.addColorStop(0.48, "rgba(255,255,255,0)");
    wash.addColorStop(1, "rgba(0,0,0,0.08)");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = lightText ? "rgba(255,255,255,0.12)" : "rgba(35,33,44,0.1)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);
  }

  function font(size, family = "Godber", weight = 400) {
    return `${weight} ${size}px "${family}"`;
  }

  function wrappedLines(ctx, text, maxWidth) {
    const words = String(text || "").trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let current = [];
    for (const word of words) {
      const candidate = [...current, word].join(" ");
      if (current.length > 0 && ctx.measureText(candidate).width > maxWidth) {
        lines.push(current.join(" "));
        current = [word];
      } else {
        current.push(word);
      }
    }
    if (current.length > 0) lines.push(current.join(" "));

    if (lines.length > 1 && lines.at(-1).split(" ").length === 1) {
      const previous = lines.at(-2).split(" ");
      if (previous.length > 2) {
        const candidate = `${previous.at(-1)} ${lines.at(-1)}`;
        if (ctx.measureText(candidate).width <= maxWidth) {
          lines[lines.length - 2] = previous.slice(0, -1).join(" ");
          lines[lines.length - 1] = candidate;
        }
      }
    }
    return lines;
  }

  function fitText(ctx, text, options) {
    const {
      family = "Godber",
      weight = 400,
      preferredSize,
      minimumSize,
      maxWidth,
      maxHeight,
      lineHeight = 1.12,
      maxLines = 7
    } = options;
    for (let size = preferredSize; size >= minimumSize; size -= 2) {
      ctx.font = font(size, family, weight);
      const lines = wrappedLines(ctx, text, maxWidth);
      const height = lines.length * size * lineHeight;
      if (lines.length <= maxLines && height <= maxHeight) return { lines, size, lineHeight: size * lineHeight };
    }
    ctx.font = font(minimumSize, family, weight);
    return { lines: wrappedLines(ctx, text, maxWidth), size: minimumSize, lineHeight: minimumSize * lineHeight };
  }

  function drawCenteredText(ctx, text, options) {
    const fitted = fitText(ctx, text, options);
    ctx.font = font(fitted.size, options.family || "Godber", options.weight || 400);
    ctx.fillStyle = options.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const totalHeight = (fitted.lines.length - 1) * fitted.lineHeight;
    let y = options.centerY - (totalHeight / 2);
    for (const line of fitted.lines) {
      ctx.fillText(line, options.centerX, y);
      y += fitted.lineHeight;
    }
    return { ...fitted, bottom: y - fitted.lineHeight + (fitted.size / 2) };
  }

  function focusPhrase(item) {
    const id = String(item.category_id || "").toLowerCase();
    const fallback = String(item.category_name || "balanced").trim().toLowerCase();
    return categoryPhrases[id] || `more ${fallback}.`;
  }

  function drawChrome(ctx, item, width, height, background) {
    const isStory = height > 1500;
    const headerColor = contrastText(background);

    ctx.font = font(isStory ? 58 : 50, "Godber", 400);
    ctx.fillStyle = headerColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("You Become", width / 2, isStory ? 220 : 70);

    ctx.font = font(isStory ? 34 : 30, "Avenir Next", 500);
    ctx.fillStyle = rgba(headerColor, 0.64);
    ctx.fillText(focusPhrase(item), width / 2, isStory ? 275 : 116);
  }

  function renderFeedFrame(item, frame, colors) {
    const canvas = document.createElement("canvas");
    canvas.width = FEED_WIDTH;
    canvas.height = FEED_HEIGHT;
    const ctx = canvas.getContext("2d", { alpha: false });
    drawBackground(ctx, FEED_WIDTH, FEED_HEIGHT, colors);
    const foreground = colors[2] ? "#f7f4ec" : "#23212c";
    drawChrome(ctx, item, FEED_WIDTH, FEED_HEIGHT, colors[0]);
    drawCenteredText(ctx, frame.text || item.hook || item.quote_text, {
      centerX: FEED_WIDTH / 2,
      centerY: FEED_HEIGHT / 2 + 10,
      preferredSize: 102,
      minimumSize: 66,
      maxWidth: 840,
      maxHeight: 690,
      maxLines: 7,
      color: foreground
    });
    return canvas;
  }

  function renderStoryFrame(item, frame, colors) {
    const canvas = document.createElement("canvas");
    canvas.width = STORY_WIDTH;
    canvas.height = STORY_HEIGHT;
    const ctx = canvas.getContext("2d", { alpha: false });
    drawBackground(ctx, STORY_WIDTH, STORY_HEIGHT, colors);
    const foreground = colors[2] ? "#f7f4ec" : "#23212c";
    drawChrome(ctx, item, STORY_WIDTH, STORY_HEIGHT, colors[0]);

    const isLegacyOpening = frame.role === "opening"
      && String(frame.text || "").trim().toLowerCase() === "a thought for today"
      && String(frame.detail || "").trim();
    const mainText = isLegacyOpening ? frame.detail : (frame.text || item.hook || item.quote_text);
    drawCenteredText(ctx, mainText, {
      centerX: STORY_WIDTH / 2,
      centerY: 890,
      preferredSize: 128,
      minimumSize: 72,
      maxWidth: 850,
      maxHeight: 760,
      maxLines: 7,
      color: foreground
    });
    return canvas;
  }

  function canvasAsset(canvas, filename) {
    const dataURL = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    return {
      filename,
      mime_type: "image/jpeg",
      data_base64: dataURL.slice(dataURL.indexOf(",") + 1),
      width: canvas.width,
      height: canvas.height
    };
  }

  async function render(item, colors) {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load('128px "Godber"'),
      document.fonts.load('500 34px "Avenir Next"')
    ]);
    const type = item.content_type === "reel" ? "static" : item.content_type;
    let frames = Array.isArray(item.frames) ? item.frames.filter((frame) => frame && frame.text) : [];
    if (type === "static") frames = [{ text: item.hook || item.quote_text }];
    if (type === "carousel" && frames.length < 2) frames = [{ text: item.hook || item.quote_text }, { text: item.cta || "Keep this thought close." }];
    if (type === "story" && frames.length === 0) frames = [{ role: "opening", text: item.hook || item.quote_text }];

    const assets = frames.slice(0, type === "carousel" ? 10 : type === "story" ? 6 : 1).map((frame, index) => {
      const canvas = type === "story" ? renderStoryFrame(item, frame, colors) : renderFeedFrame(item, frame, colors);
      const suffix = String(index + 1).padStart(2, "0");
      return canvasAsset(canvas, `you-become-${type}-${item.id}-${suffix}.jpg`);
    });
    return { content_type: type, assets };
  }

  document.documentElement.dataset.rendererVersion = RENDERER_VERSION;
  window.YouBecomeRenderer = { render, version: RENDERER_VERSION };
})();
