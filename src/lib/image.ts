// Nén & thu nhỏ ảnh trước khi gửi AI/backend — giảm dung lượng vài MB xuống còn ~100–300KB
// nên upload + nhận diện NHANH hơn hẳn (ảnh phone thường 3–8MB, đọc ly/tem chỉ cần ~1024px là thừa).
export async function compressImage(file: Blob, maxDim = 1024, quality = 0.82): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    if (!g) return file;
    g.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', quality));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file; // lỗi thì dùng ảnh gốc
  } finally {
    URL.revokeObjectURL(url);
  }
}
