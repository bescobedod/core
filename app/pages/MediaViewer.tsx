import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from "react";
import {
  Maximize2,
  Minimize2,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export type MediaFile = {
  id: string | number;
  name: string;
  url_archivo: string;
  type: "image" | "pdf" | "video";
};


interface MediaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  files: MediaFile[];
  initialIndex?: number;
  autoEnterFullscreen?: boolean;
  disableFullscreen?: boolean;
}

function isEmbeddedIframe(): boolean {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
}

function canUseFullscreen(disableFullscreenProp?: boolean): boolean {
  if (disableFullscreenProp) return false;
  if (isEmbeddedIframe()) return false;
  if (typeof document === "undefined") return false;
  return !!document.fullscreenEnabled;
}

export function MediaViewer({
  isOpen,
  onClose,
  files,
  initialIndex = 0,
  autoEnterFullscreen = true,
  disableFullscreen = false,
}: MediaViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fsAvailable, setFsAvailable] = useState<boolean>(() =>
    canUseFullscreen(disableFullscreen)
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIndex(initialIndex);
      setFsAvailable(canUseFullscreen(disableFullscreen));
    }
  }, [isOpen, initialIndex, disableFullscreen]);

  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  useEffect(() => {
    const handler = () => {
      const fsElement =
        document.fullscreenElement ||
        // @ts-ignore
        document.webkitFullscreenElement ||
        // @ts-ignore
        document.msFullscreenElement;
      setIsFullscreen(!!fsElement);
    };
    document.addEventListener("fullscreenchange", handler);
    // @ts-ignore
    document.addEventListener("webkitfullscreenchange", handler);
    // @ts-ignore
    document.addEventListener("msfullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      // @ts-ignore
      document.removeEventListener("webkitfullscreenchange", handler);
      // @ts-ignore
      document.removeEventListener("msfullscreenchange", handler);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isFullscreen) {
          exitFullscreen();
        } else {
          onClose();
        }
      } else if (e.key === "ArrowLeft") {
        setIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight") {
        setIndex((i) => Math.min(files.length - 1, i + 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isFullscreen, files.length]);

  const enterFullscreen = useCallback(async () => {
    if (!fsAvailable) return;
    const file = files[index];
    try {
      if (file?.type === "video" && videoRef.current) {
        // @ts-ignore (iOS Safari)
        if (typeof videoRef.current.webkitEnterFullscreen === "function") {
          // @ts-ignore
          videoRef.current.webkitEnterFullscreen();
          setIsFullscreen(true);
          return;
        }
        if (videoRef.current.requestFullscreen) {
          await videoRef.current.requestFullscreen();
          setIsFullscreen(true);
          return;
        }
      }
      const el = containerRef.current;
      if (!el) return;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
        // @ts-ignore
      } else if (el.webkitRequestFullscreen) {
        // @ts-ignore
        el.webkitRequestFullscreen();
        // @ts-ignore
      } else if (el.msRequestFullscreen) {
        // @ts-ignore
        el.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (e) {
      console.warn("Fullscreen bloqueado por policy:", e);
      setIsFullscreen(false);
    }
  }, [index, files, fsAvailable]);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        // @ts-ignore
      } else if (document.webkitExitFullscreen) {
        // @ts-ignore
        await document.webkitExitFullscreen();
        // @ts-ignore
      } else if (document.msExitFullscreen) {
        // @ts-ignore
        await document.msExitFullscreen();
      }
      setIsFullscreen(false);
    } catch (e) {
      console.error("Error al salir de pantalla completa:", e);
    }
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !autoEnterFullscreen || !fsAvailable) return;
    const id = requestAnimationFrame(() => {
      void enterFullscreen();
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen, autoEnterFullscreen, enterFullscreen, fsAvailable]);

  if (!isOpen || files.length === 0) return null;

  const file = files[Math.min(Math.max(0, index), files.length - 1)];

    const handleBackdropClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (e.target === e.currentTarget) {
            if (isFullscreen) {
            void exitFullscreen();
            }

            onClose();
        }
    };

  return (
    <div
      className="
        fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center
        p-0 sm:p-4
      "
      onClick={handleBackdropClick}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="
          relative w-screen h-screen sm:w-full sm:max-w-5xl sm:h-[80vh]
          bg-white rounded-none sm:rounded-lg shadow-xl overflow-hidden
        "
      >
        <div
          className="
            absolute top-0 left-0 right-0 z-30 flex items-center justify-between
            p-2 bg-gradient-to-b from-black/60 to-transparent
            pointer-events-none
          "
        >
          <div className="flex items-center gap-2 pr-2">
            <button
            onClick={(e) => {
                e.stopPropagation();

                if (isFullscreen) {
                  void exitFullscreen();
                }

                onClose();
              }}
            className="
                inline-flex items-center justify-center w-9 h-9 rounded-md
                bg-white/10 hover:bg-white/20 text-white
                pointer-events-auto
            "
            title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div
          ref={containerRef}
          className="
            w-full h-full bg-black flex items-center justify-center
            touch-pan-x touch-pan-y overscroll-contain
            relative z-10
          "
        >
          {file.type === "image" && (
            <img
              src={file.url_archivo}
              alt={file.name}
              className="max-w-full max-h-full object-contain select-none pointer-events-auto z-20"
              draggable={false}
              style={{ touchAction: "manipulation" }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {file.type === "pdf" && (
            <iframe
              src={`${file.url_archivo}${file.url_archivo.includes('#') ? '' : '#'}${file.url_archivo.includes('toolbar=') ? '' : 'toolbar=1'}`}
              title={file.name}
              className="w-full h-full bg-white pointer-events-auto z-20"
              allow="fullscreen; autoplay"
              allowFullScreen
              style={{ border: "none", touchAction: "auto" }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {file.type === "video" && (
            <video
              ref={videoRef}
              src={file.url_archivo}
              controls
              className="max-w-full max-h-full pointer-events-auto z-20"
              playsInline
              controlsList="nodownload"
              // @ts-ignore (iOS Safari)
              webkit-playsinline="true"
              style={{ touchAction: "manipulation" }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
        <div
          className="
            absolute bottom-0 left-0 right-0 p-2 flex items-center justify-center
            bg-gradient-to-t from-black/60 to-transparent
            pointer-events-none z-30
          "
        >
          <span className="text-white text-xs">
            {index + 1} / {files.length}
          </span>
        </div>
      </div>
    </div>
  );
}