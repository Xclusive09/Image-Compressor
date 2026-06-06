"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";
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
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("theme");
    const prefersDark =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = storedTheme ? storedTheme === "dark" : prefersDark;

    setIsDarkMode(shouldUseDark);
    document.documentElement.classList.toggle("dark", shouldUseDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    window.localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

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
    <main className="min-h-screen bg-[#f7f8f3] transition-colors dark:bg-[#101820]">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-[#dbe0d2] pb-5 dark:border-[#2b3c46]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold uppercase tracking-wide text-leaf dark:text-[#72d6a6]">
              Best possible quality under your selected target size.
            </p>
            <button
              type="button"
              onClick={() => setIsDarkMode((current) => !current)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#cbd5c0] bg-white text-ink shadow-sm transition hover:border-leaf dark:border-[#3b515f] dark:bg-[#17232d] dark:text-[#edf4ee] dark:hover:border-[#72d6a6]"
              aria-pressed={isDarkMode}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-ink dark:text-[#f5f8f1] sm:text-4xl">
                NYSC Image Compressor
              </h1>
              <p className="mt-2 max-w-2xl text-base text-[#4d5a63] dark:text-[#b9c6ce]">
                Compress your passport or photo to a specific file size with the
                best possible quality.
              </p>
            </div>
            <p className="max-w-sm text-sm text-[#65717a] dark:text-[#a6b3bb]">
              Very small sizes like 7KB may require visible quality reduction
              depending on the original image.
            </p>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-lg border border-[#dbe0d2] bg-white p-4 shadow-sm transition-colors dark:border-[#2b3c46] dark:bg-[#17232d] sm:p-5">
            <h2 className="text-lg font-semibold text-ink dark:text-[#f5f8f1]">Upload image</h2>
            <label
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`mt-4 flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 text-center transition ${
                isDragging
                  ? "border-leaf bg-[#edf8f2] dark:border-[#72d6a6] dark:bg-[#183329]"
                  : "border-[#cbd5c0] bg-[#fbfcf7] hover:border-leaf dark:border-[#3b515f] dark:bg-[#111c24] dark:hover:border-[#72d6a6]"
              }`}
            >
              <input
                aria-label="Upload image"
                className="sr-only"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleInputChange}
              />
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e5f3eb] text-2xl text-leaf dark:bg-[#214235] dark:text-[#72d6a6]">
                +
              </span>
              <span className="mt-3 text-base font-semibold text-ink dark:text-[#f5f8f1]">
                Drop your passport photo here
              </span>
              <span className="mt-1 text-sm text-[#65717a] dark:text-[#a6b3bb]">
                or tap to choose a JPG, PNG, or WebP file
              </span>
            </label>

            {file && (
              <div className="mt-4 rounded-lg bg-[#f2f5ec] p-4 dark:bg-[#111c24]">
                <p className="break-words font-medium text-ink dark:text-[#f5f8f1]">{file.name}</p>
                <p className="text-sm text-[#65717a] dark:text-[#a6b3bb]">
                  Original size: {formatKb(file.size / 1024)}
                </p>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-[#dbe0d2] bg-white p-4 shadow-sm transition-colors dark:border-[#2b3c46] dark:bg-[#17232d] sm:p-5">
            <h2 className="text-lg font-semibold text-ink dark:text-[#f5f8f1]">Compression settings</h2>
            <div className="mt-4">
              <label
                htmlFor="targetKb"
                className="text-sm font-medium text-[#34414b] dark:text-[#d8e1e5]"
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
                className="mt-2 w-full rounded-lg border border-[#cbd5c0] bg-white px-3 py-3 text-lg font-semibold text-ink outline-none focus:border-leaf focus:ring-2 focus:ring-[#bfe6d1] dark:border-[#3b515f] dark:bg-[#101820] dark:text-[#f5f8f1] dark:focus:border-[#72d6a6] dark:focus:ring-[#25503b]"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTargetKb(preset)}
                  className={`rounded-lg border px-2 py-3 text-sm font-semibold transition ${
                    targetKb === preset
                      ? "border-leaf bg-leaf text-white dark:border-[#72d6a6] dark:bg-[#2a9f6b]"
                      : "border-[#cbd5c0] bg-white text-ink hover:border-leaf dark:border-[#3b515f] dark:bg-[#101820] dark:text-[#edf4ee] dark:hover:border-[#72d6a6]"
                  }`}
                >
                  {preset}KB
                </button>
              ))}
            </div>

            <fieldset className="mt-5">
              <legend className="text-sm font-medium text-[#34414b] dark:text-[#d8e1e5]">
                Compression mode
              </legend>
              <div className="mt-2 grid gap-2">
                {modes.map((item) => (
                  <label
                    key={item.value}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-3 ${
                      mode === item.value
                        ? "border-leaf bg-[#edf8f2] dark:border-[#72d6a6] dark:bg-[#183329]"
                        : "border-[#dbe0d2] bg-white dark:border-[#3b515f] dark:bg-[#101820]"
                    }`}
                  >
                    <span className="font-medium text-ink dark:text-[#edf4ee]">{item.label}</span>
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
              <p role="alert" className="mt-4 rounded-lg bg-[#fff1ed] p-3 text-sm text-[#a8422b] dark:bg-[#3c1f18] dark:text-[#ffb19c]">
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
          <section className="rounded-lg border border-[#dbe0d2] bg-white p-4 shadow-sm transition-colors dark:border-[#2b3c46] dark:bg-[#17232d] sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-ink dark:text-[#f5f8f1]">Result</h2>
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2b3844] dark:bg-[#edf4ee] dark:text-[#101820] dark:hover:bg-white"
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
              <p className="mt-4 rounded-lg bg-[#fff8e6] p-3 text-sm text-[#855f13] dark:bg-[#3b3015] dark:text-[#f8d682]">
                {result.warning}
              </p>
            )}
          </section>
        )}

        <footer className="flex flex-col items-center gap-1 pb-3 text-center text-sm text-[#65717a] dark:text-[#a6b3bb]">
          <p>
            &lt; built by{" "}
            <a
              href="https://xcluisve.tech"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-leaf underline-offset-4 hover:underline dark:text-[#72d6a6]"
            >
              Xclusive
            </a>{" "}
            &gt;
          </p>
          <p>Images are processed in memory and are not stored permanently.</p>
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
    <section className="rounded-lg border border-[#dbe0d2] bg-white p-4 shadow-sm transition-colors dark:border-[#2b3c46] dark:bg-[#17232d] sm:p-5">
      <h2 className="text-lg font-semibold text-ink dark:text-[#f5f8f1]">{title}</h2>
      <div className="mt-4 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-[#eef2e8] dark:bg-[#101820]">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={title}
            className="h-full w-full object-contain"
          />
        ) : (
          <p className="px-4 text-center text-sm text-[#65717a] dark:text-[#a6b3bb]">{empty}</p>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#f2f5ec] p-3 dark:bg-[#101820]">
      <dt className="text-xs font-medium uppercase tracking-wide text-[#65717a] dark:text-[#a6b3bb]">
        {label}
      </dt>
      <dd className="mt-1 break-words text-base font-semibold text-ink dark:text-[#f5f8f1]">{value}</dd>
    </div>
  );
}

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.99 12.79A9 9 0 1 1 11.21 3.01 7 7 0 0 0 20.99 12.79z" />
    </svg>
  );
}
