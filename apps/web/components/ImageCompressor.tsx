"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import {
  CompressionData,
  CompressionMode,
  compressImage,
  formatKb
} from "@/lib/api";

const presets = [7, 10, 12, 20];
const modes: Array<{ value: CompressionMode; label: string }> = [
  { value: "balanced", label: "Balanced" },
  { value: "aggressive", label: "Aggressive" },
  { value: "max", label: "Max compression" }
];
const acceptedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export function ImageCompressor() {
  const [file, setFile] = useState<File | null>(null);
  const [targetKb, setTargetKb] = useState(12);
  const [mode, setMode] = useState<CompressionMode>("balanced");
  const [result, setResult] = useState<CompressionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const originalPreview = useMemo(() => {
    if (!file) {
      return null;
    }
    return URL.createObjectURL(file);
  }, [file]);

  function selectFile(nextFile?: File) {
    setError(null);
    setResult(null);

    if (!nextFile) {
      return;
    }

    if (!acceptedTypes.includes(nextFile.type)) {
      setFile(null);
      setError("Please upload a JPG, PNG, or WebP image.");
      return;
    }

    setFile(nextFile);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files?.[0]);
  }

  async function handleCompress() {
    if (!file) {
      return;
    }

    setIsCompressing(true);
    setError(null);
    setResult(null);

    try {
      const response = await compressImage(file, targetKb, mode);
      if (!response.success) {
        setError(
          response.message ||
            "This image cannot reach the selected size without becoming too poor in quality. Try a higher target size or use aggressive mode."
        );
        return;
      }

      setResult(response.data);
    } catch {
      setError("The image could not be compressed right now. Please try again.");
    } finally {
      setIsCompressing(false);
    }
  }

  function handleDownload() {
    if (!result) {
      return;
    }

    const link = document.createElement("a");
    link.href = result.base64;
    link.download = result.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <main className="min-h-screen bg-[#f7f8f3]">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-[#dbe0d2] pb-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-leaf">
            Best possible quality under your selected target size.
          </p>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-ink sm:text-4xl">
                NYSC Image Compressor
              </h1>
              <p className="mt-2 max-w-2xl text-base text-[#4d5a63]">
                Compress your passport or photo to a specific file size with the
                best possible quality.
              </p>
            </div>
            <p className="max-w-sm text-sm text-[#65717a]">
              Very small sizes like 7KB may require visible quality reduction
              depending on the original image.
            </p>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-lg border border-[#dbe0d2] bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-semibold text-ink">Upload image</h2>
            <label
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`mt-4 flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 text-center transition ${
                isDragging
                  ? "border-leaf bg-[#edf8f2]"
                  : "border-[#cbd5c0] bg-[#fbfcf7] hover:border-leaf"
              }`}
            >
              <input
                aria-label="Upload image"
                className="sr-only"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleInputChange}
              />
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e5f3eb] text-2xl text-leaf">
                +
              </span>
              <span className="mt-3 text-base font-semibold text-ink">
                Drop your passport photo here
              </span>
              <span className="mt-1 text-sm text-[#65717a]">
                or tap to choose a JPG, PNG, or WebP file
              </span>
            </label>

            {file && (
              <div className="mt-4 rounded-lg bg-[#f2f5ec] p-4">
                <p className="font-medium text-ink">{file.name}</p>
                <p className="text-sm text-[#65717a]">
                  Original size: {formatKb(file.size / 1024)}
                </p>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-[#dbe0d2] bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-semibold text-ink">Compression settings</h2>
            <div className="mt-4">
              <label
                htmlFor="targetKb"
                className="text-sm font-medium text-[#34414b]"
              >
                Target size in KB
              </label>
              <input
                id="targetKb"
                min={5}
                max={500}
                type="number"
                value={targetKb}
                onChange={(event) => setTargetKb(Number(event.target.value))}
                className="mt-2 w-full rounded-lg border border-[#cbd5c0] px-3 py-3 text-lg font-semibold outline-none focus:border-leaf focus:ring-2 focus:ring-[#bfe6d1]"
              />
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTargetKb(preset)}
                  className={`rounded-lg border px-2 py-3 text-sm font-semibold transition ${
                    targetKb === preset
                      ? "border-leaf bg-leaf text-white"
                      : "border-[#cbd5c0] bg-white text-ink hover:border-leaf"
                  }`}
                >
                  {preset}KB
                </button>
              ))}
            </div>

            <fieldset className="mt-5">
              <legend className="text-sm font-medium text-[#34414b]">
                Compression mode
              </legend>
              <div className="mt-2 grid gap-2">
                {modes.map((item) => (
                  <label
                    key={item.value}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-3 ${
                      mode === item.value
                        ? "border-leaf bg-[#edf8f2]"
                        : "border-[#dbe0d2] bg-white"
                    }`}
                  >
                    <span className="font-medium text-ink">{item.label}</span>
                    <input
                      type="radio"
                      name="mode"
                      value={item.value}
                      checked={mode === item.value}
                      onChange={() => setMode(item.value)}
                      className="h-4 w-4 accent-leaf"
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <button
              type="button"
              disabled={!file || isCompressing || targetKb < 5 || targetKb > 500}
              onClick={handleCompress}
              className="mt-5 w-full rounded-lg bg-leaf px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[#176c47] disabled:cursor-not-allowed disabled:bg-[#9ab7a8]"
            >
              {isCompressing ? "Compressing..." : "Compress Image"}
            </button>

            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-[#fff1ed] p-3 text-sm text-[#a8422b]">
                {error}
              </p>
            )}
          </section>
        </div>

        <section className="grid gap-5 lg:grid-cols-2">
          <PreviewPanel title="Original preview" src={originalPreview} empty="Upload an image to preview it." />
          <PreviewPanel
            title="Compressed preview"
            src={result?.base64 ?? null}
            empty="Your compressed image will appear here."
          />
        </section>

        {result && (
          <section className="rounded-lg border border-[#dbe0d2] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-ink">Result</h2>
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2b3844]"
              >
                Download Compressed Image
              </button>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Metric label="Original" value={formatKb(result.originalSizeKb)} />
              <Metric label="Compressed" value={formatKb(result.compressedSizeKb)} />
              <Metric label="Target" value={formatKb(result.targetSizeKb)} />
              <Metric label="Saved" value={`${result.compressionRatio.toFixed(1)}%`} />
              <Metric label="Dimensions" value={`${result.width} x ${result.height}`} />
              <Metric label="Quality" value={`${result.quality}`} />
            </dl>
            {result.warning && (
              <p className="mt-4 rounded-lg bg-[#fff8e6] p-3 text-sm text-[#855f13]">
                {result.warning}
              </p>
            )}
          </section>
        )}

        <footer className="pb-3 text-center text-sm text-[#65717a]">
          Images are processed in memory and are not stored permanently.
        </footer>
      </section>
    </main>
  );
}

function PreviewPanel({
  title,
  src,
  empty
}: {
  title: string;
  src: string | null;
  empty: string;
}) {
  return (
    <section className="rounded-lg border border-[#dbe0d2] bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-4 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-[#eef2e8]">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={title}
            className="h-full w-full object-contain"
          />
        ) : (
          <p className="px-4 text-center text-sm text-[#65717a]">{empty}</p>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#f2f5ec] p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-[#65717a]">
        {label}
      </dt>
      <dd className="mt-1 break-words text-base font-semibold text-ink">{value}</dd>
    </div>
  );
}
