import os
from PIL import Image

TARGET_W = 2398
TARGET_H = 827
MARGIN_PX = 24  # >= 2mm at 300 DPI (2mm = 23.6px)

def process_banner(in_path: str, out_path: str, target_w: int = TARGET_W, target_h: int = TARGET_H, margin_px: int = MARGIN_PX):
    im = Image.open(in_path).convert("RGB")
    
    # 1. Clean background noise: threshold near-white to pure white (255)
    lut = [255 if i >= 232 else i for i in range(256)] * 3
    im = im.point(lut)
    
    # 2. Find ink bounding box (pixels darker than 235)
    gray = im.convert("L")
    inv = gray.point(lambda p: 255 - p if p < 235 else 0)
    bbox = inv.getbbox()
    if not bbox:
        bbox = (0, 0, im.width, im.height)
        
    pad = 8
    crop_x1 = max(0, bbox[0] - pad)
    crop_y1 = max(0, bbox[1] - pad)
    crop_x2 = min(im.width, bbox[2] + pad)
    crop_y2 = min(im.height, bbox[3] + pad)
    crop = im.crop((crop_x1, crop_y1, crop_x2, crop_y2))
    
    # 3. Scale to fit within safe margins preserving aspect ratio
    max_w = target_w - 2 * margin_px
    max_h = target_h - 2 * margin_px
    scale = min(max_w / crop.width, max_h / crop.height)
    new_w = max(1, int(round(crop.width * scale)))
    new_h = max(1, int(round(crop.height * scale)))
    
    resized = crop.resize((new_w, new_h), Image.Resampling.LANCZOS)
    resized = resized.point(lut)
    
    # 4. Center on pure white canvas
    canvas = Image.new("RGB", (target_w, target_h), (255, 255, 255))
    paste_x = (target_w - new_w) // 2
    paste_y = (target_h - new_h) // 2
    canvas.paste(resized, (paste_x, paste_y))
    
    # 5. Save JPEG
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    canvas.save(out_path, format="JPEG", quality=95, optimize=True)
    return out_path

if __name__ == "__main__":
    import sys
    import json
    if len(sys.argv) >= 4 and sys.argv[1] == "range":
        start_idx = int(sys.argv[2])
        end_idx = int(sys.argv[3])
        # Find repo root
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        json_path = os.path.join(repo_root, "docs", "homescool-image-prompts.json")
        assets_dir = "C:/Users/eduar/.cursor/projects/c-Users-eduar-Documents-work-int-eduardoos-services-eduardoos-com/assets"
        with open(json_path, "r", encoding="utf-8") as f:
            items = json.load(f)
        for i in range(start_idx, end_idx):
            item = items[i]
            in_p = os.path.join(assets_dir, item["file"])
            out_p = os.path.join(repo_root, item["outPath"])
            process_banner(in_p, out_p)
            print(f"Processed [{i}]: {item['file']} -> {out_p}")
    elif len(sys.argv) >= 3:
        process_banner(sys.argv[1], sys.argv[2])
