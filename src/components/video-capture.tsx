import { useEffect, useRef, useState } from "react";
import { Circle, Square, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onCaptured: (file: File | null) => void;
  disabled?: boolean;
};

export function VideoCapture({ onCaptured, disabled }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setSupported(false);
    }
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const file = new File([blob], `depoimento-${Date.now()}.webm`, {
          type: "video/webm",
        });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        onCaptured(file);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
      };
      recorder.start();
      setRecording(true);
    } catch {
      setError("Não foi possível acessar a câmera. Use o upload de arquivo.");
      setSupported(false);
    }
  };

  const stop = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  if (!supported) {
    return (
      <p className="text-xs text-muted-foreground">
        Seu navegador não permite gravar vídeo aqui. Use o campo de upload abaixo.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-dashed p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Video className="size-4 text-primary" />
        Gravar depoimento em vídeo
      </div>
      <video
        ref={videoRef}
        muted
        playsInline
        className={`aspect-video w-full rounded-lg bg-black object-cover ${
          recording || previewUrl ? "block" : "hidden"
        }`}
        src={previewUrl || undefined}
        controls={Boolean(previewUrl) && !recording}
      />
      <div className="flex flex-wrap gap-2">
        {!recording ? (
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={start}
          >
            <Circle className="size-4 fill-destructive text-destructive" />
            {previewUrl ? "Gravar de novo" : "Abrir câmera e gravar"}
          </Button>
        ) : (
          <Button type="button" variant="destructive" onClick={stop}>
            <Square className="size-4" /> Parar gravação
          </Button>
        )}
        {previewUrl && !recording && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setPreviewUrl(null);
              onCaptured(null);
            }}
          >
            Remover vídeo
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
