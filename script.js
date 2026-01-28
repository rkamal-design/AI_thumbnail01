const urlInput = document.getElementById("youtube-url");
const captionInput = document.getElementById("caption-text");
const captionStyle = document.getElementById("caption-style");
const tokenInput = document.getElementById("hf-token");
const promptField = document.getElementById("prompt");
const generateButton = document.getElementById("generate");
const clearButton = document.getElementById("clear");
const feedback = document.getElementById("feedback");
const thumbnailCanvas = document.getElementById("thumbnail");
const emptyState = document.getElementById("empty-state");
const downloadLink = document.getElementById("download-link");

const YOUTUBE_REGEX = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/;
const DEFAULT_PROMPT_PREFIX = "cinematic YouTube thumbnail, vivid colors, sharp focus";
const DEFAULT_FONT = "700 72px 'Inter', 'Arial Black', sans-serif";

const setFeedback = (message, isError = false) => {
  feedback.textContent = message;
  feedback.style.color = isError ? "#c80028" : "#2b6b2e";
};

const resetPreview = () => {
  const ctx = thumbnailCanvas.getContext("2d");
  ctx.clearRect(0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
  thumbnailCanvas.classList.remove("visible");
  emptyState.style.display = "block";
  downloadLink.href = "#";
};

const extractVideoId = (value) => {
  if (!value) return "";
  const trimmed = value.trim();
  const match = trimmed.match(YOUTUBE_REGEX);
  if (match) {
    return match[1];
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("youtube.com")) {
      return url.searchParams.get("v") || "";
    }
  } catch (error) {
    return "";
  }

  return "";
};

const fetchVideoMetadata = async (videoUrl) => {
  const response = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`
  );
  if (!response.ok) {
    throw new Error("Unable to fetch video metadata. Check the URL.");
  }
  return response.json();
};

const buildPrompt = ({ title, author_name }) =>
  `${DEFAULT_PROMPT_PREFIX}, scene inspired by "${title}" by ${author_name}, expressive lighting, ultra detailed, 16:9`;

const requestDiffusionImage = async (prompt, token) => {
  const response = await fetch(
    "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "image/png",
      },
      body: JSON.stringify({ inputs: prompt }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Diffusion request failed (${response.status}). ${errorText || "Check your token."}`
    );
  }

  const blob = await response.blob();
  return createImageBitmap(blob);
};

const drawCaption = (ctx, text, style) => {
  const { width, height } = thumbnailCanvas;
  ctx.font = DEFAULT_FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 16;

  const lines = text.split("\n");
  const lineHeight = 78;
  const totalHeight = lines.length * lineHeight;

  const getTextY = () => {
    if (style === "center") return height / 2 - totalHeight / 2 + lineHeight / 2;
    return height - totalHeight - 80 + lineHeight / 2;
  };

  if (style === "bold") {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, height - totalHeight - 110, width, totalHeight + 80);
    ctx.fillStyle = "#ffffff";
  }

  if (style === "center") {
    ctx.fillStyle = "rgba(255,0,51,0.85)";
    ctx.fillRect(0, height / 2 - totalHeight / 2 - 40, width, totalHeight + 80);
    ctx.fillStyle = "#ffffff";
  }

  if (style === "outlined") {
    ctx.fillStyle = "#ffffff";
  }

  lines.forEach((line, index) => {
    const y = getTextY() + index * lineHeight;
    if (style === "outlined") {
      ctx.lineWidth = 12;
      ctx.strokeStyle = "rgba(0,0,0,0.75)";
      ctx.strokeText(line, width / 2, y);
    }
    ctx.fillText(line, width / 2, y);
  });

  ctx.shadowBlur = 0;
};

const wrapCaption = (text) => {
  const maxLength = 22;
  const words = text.split(" ");
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const tentative = current ? `${current} ${word}` : word;
    if (tentative.length > maxLength) {
      lines.push(current);
      current = word;
    } else {
      current = tentative;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, 3).join("\n");
};

const updateThumbnail = async () => {
  const videoUrl = urlInput.value.trim();
  const token = tokenInput.value.trim();
  if (!videoUrl || !extractVideoId(videoUrl)) {
    setFeedback("Please enter a valid YouTube URL.", true);
    resetPreview();
    return;
  }

  if (!token) {
    setFeedback("Add a Hugging Face token to run diffusion.", true);
    return;
  }

  generateButton.disabled = true;
  setFeedback("Analyzing the video and generating diffusion art...");

  try {
    const metadata = await fetchVideoMetadata(videoUrl);
    const prompt = buildPrompt(metadata);
    promptField.value = prompt;

    const caption = captionInput.value.trim() || metadata.title;
    captionInput.value = caption;

    const image = await requestDiffusionImage(prompt, token);

    const ctx = thumbnailCanvas.getContext("2d");
    ctx.clearRect(0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
    ctx.drawImage(image, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
    drawCaption(ctx, wrapCaption(caption.toUpperCase()), captionStyle.value);

    thumbnailCanvas.classList.add("visible");
    emptyState.style.display = "none";

    const dataUrl = thumbnailCanvas.toDataURL("image/png");
    downloadLink.href = dataUrl;
    downloadLink.download = "youtube-thumbnail.png";

    setFeedback("Thumbnail generated successfully.");
  } catch (error) {
    setFeedback(error.message || "Something went wrong.", true);
  } finally {
    generateButton.disabled = false;
  }
};

generateButton.addEventListener("click", updateThumbnail);

clearButton.addEventListener("click", () => {
  urlInput.value = "";
  captionInput.value = "";
  tokenInput.value = "";
  promptField.value = "";
  captionStyle.value = "bold";
  setFeedback("");
  resetPreview();
});

urlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    updateThumbnail();
  }
});

resetPreview();
