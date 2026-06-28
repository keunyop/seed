export const PHOTO_DATA_URL_MAX_BYTES = 500_000;

const ORIGINAL_FILE_READ_THRESHOLD_BYTES = 360_000;
const INITIAL_MAX_IMAGE_EDGE = 1024;
const MIN_IMAGE_EDGE = 240;
const JPEG_QUALITY_STEPS = [0.82, 0.72, 0.62, 0.52, 0.44, 0.36, 0.3];

export type PreparedPhotoDataUrl =
  | { ok: true; dataUrl: string; wasCompressed: boolean }
  | { ok: false; message: string };

export type ImageSize = {
  width: number;
  height: number;
};

export function getDataUrlByteSize(dataUrl: string) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(dataUrl).byteLength;
  }

  return dataUrl.length;
}

export function getScaledImageSize(size: ImageSize, maxEdge: number): ImageSize {
  const width = Math.max(1, Math.round(size.width));
  const height = Math.max(1, Math.round(size.height));
  const largestEdge = Math.max(width, height);

  if (largestEdge <= maxEdge) {
    return { width, height };
  }

  const ratio = maxEdge / largestEdge;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export function getNextPhotoResizeEdge(currentEdge: number) {
  return Math.floor(currentEdge * 0.78);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    function cleanup() {
      URL.revokeObjectURL(objectUrl);
    }

    image.onload = () => {
      cleanup();
      resolve(image);
    };
    image.onerror = () => {
      cleanup();
      reject(new Error("decode-failed"));
    };
    image.src = objectUrl;
  });
}

function renderImageToJpegDataUrl(image: HTMLImageElement, maxEdge: number, quality: number) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) {
    throw new Error("empty-image");
  }

  const targetSize = getScaledImageSize({ width: sourceWidth, height: sourceHeight }, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = targetSize.width;
  canvas.height = targetSize.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("canvas-unavailable");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, targetSize.width, targetSize.height);
  context.drawImage(image, 0, 0, targetSize.width, targetSize.height);

  return canvas.toDataURL("image/jpeg", quality);
}

async function compressImageToDataUrl(file: File) {
  const image = await loadImage(file);
  const sourceEdge = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height);
  let maxEdge = Math.min(INITIAL_MAX_IMAGE_EDGE, sourceEdge || INITIAL_MAX_IMAGE_EDGE);

  while (maxEdge >= MIN_IMAGE_EDGE) {
    for (const quality of JPEG_QUALITY_STEPS) {
      const dataUrl = renderImageToJpegDataUrl(image, maxEdge, quality);
      if (getDataUrlByteSize(dataUrl) <= PHOTO_DATA_URL_MAX_BYTES) {
        return dataUrl;
      }
    }

    maxEdge = getNextPhotoResizeEdge(maxEdge);
  }

  return null;
}

export async function preparePhotoDataUrl(file: File): Promise<PreparedPhotoDataUrl> {
  if (!file.type.startsWith("image/")) {
    return { ok: false, message: "이미지 파일만 선택해 주세요." };
  }

  if (file.size <= ORIGINAL_FILE_READ_THRESHOLD_BYTES) {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (getDataUrlByteSize(dataUrl) <= PHOTO_DATA_URL_MAX_BYTES) {
        return { ok: true, dataUrl, wasCompressed: false };
      }
    } catch {
      return { ok: false, message: "사진을 읽지 못했습니다. 다른 파일을 선택해 주세요." };
    }
  }

  try {
    const compressedDataUrl = await compressImageToDataUrl(file);
    if (compressedDataUrl) {
      return { ok: true, dataUrl: compressedDataUrl, wasCompressed: true };
    }
  } catch {
    return {
      ok: false,
      message: "사진 크기를 자동으로 줄이지 못했습니다. JPG 또는 PNG 사진으로 다시 선택해 주세요.",
    };
  }

  return {
    ok: false,
    message: "사진을 500KB 이하로 줄이지 못했습니다. 더 작은 사진을 선택해 주세요.",
  };
}
