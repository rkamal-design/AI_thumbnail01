# AI Thumbnail Generator

Generate YouTube video thumbnails by pasting a video URL, analyzing its metadata, and creating a diffusion-based image with captions.

## Getting started

1. Open `index.html` in your browser (or serve the folder with `python -m http.server 8000`).
2. Paste a YouTube video link.
3. Add a Hugging Face access token in the UI.
4. Click **Generate thumbnail** and download the image.

### Requirements

This demo calls the Hugging Face Inference API for Stable Diffusion. Provide your own Hugging Face access token in the UI before generating a thumbnail.

1. Go to https://huggingface.co/settings/tokens
2. Create a token with read access.
3. Paste it into the app when prompted.

## How it works

- The app fetches video metadata from the YouTube oEmbed endpoint.
- A diffusion prompt is generated from the title and channel.
- The Stable Diffusion API returns an image that is combined with a caption overlay for download.
