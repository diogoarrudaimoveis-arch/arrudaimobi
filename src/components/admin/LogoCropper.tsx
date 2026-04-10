import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Upload, Crop as CropIcon } from "lucide-react";

interface LogoCropperProps {
  open: boolean;
  onClose: () => void;
  onCropped: (blob: Blob) => void;
  aspect?: number;
}

function getCroppedBlob(image: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0, 0,
    canvas.width,
    canvas.height
  );
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png", 1);
  });
}

export function LogoCropper({ open, onClose, onCropped, aspect }: LogoCropperProps) {
  const [imgSrc, setImgSrc] = useState("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = () => setImgSrc(reader.result as string);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCropComplete = useCallback(async () => {
    if (!imgRef.current || !completedCrop) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop);
      onCropped(blob);
    } finally {
      setSaving(false);
      setImgSrc("");
      setCrop(undefined);
      setCompletedCrop(undefined);
    }
  }, [completedCrop, onCropped]);

  const handleClose = () => {
    setImgSrc("");
    setCrop(undefined);
    setCompletedCrop(undefined);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="h-5 w-5 text-primary" /> Upload e Corte da Logo
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!imgSrc ? (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-10 transition-colors hover:border-primary/40 hover:bg-secondary/30">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Clique para selecionar uma imagem</span>
              <input type="file" accept="image/*" className="hidden" onChange={onSelectFile} />
            </label>
          ) : (
            <div className="flex justify-center">
              <ReactCrop crop={crop} onChange={setCrop} onComplete={setCompletedCrop} aspect={aspect}>
                <img ref={imgRef} src={imgSrc} alt="Crop" className="max-h-[400px] rounded" />
              </ReactCrop>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          {imgSrc && (
            <Button onClick={handleCropComplete} disabled={!completedCrop || saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CropIcon className="h-4 w-4" />}
              Aplicar Corte
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}