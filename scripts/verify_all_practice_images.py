import json
import os
from PIL import Image

def verify_all():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    json_path = os.path.join(repo_root, "docs", "homescool-image-prompts.json")

    with open(json_path, "r", encoding="utf-8") as f:
        items = json.load(f)

    print(f"Total items in JSON: {len(items)}")
    assert len(items) == 74, f"Expected 74 items, got {len(items)}"

    errors = []
    for idx, it in enumerate(items):
        out_p = os.path.join(repo_root, it["outPath"])
        if not os.path.exists(out_p):
            errors.append(f"Missing [{idx}]: {out_p}")
            continue
        try:
            im = Image.open(out_p)
            if im.size != (2398, 827):
                errors.append(f"Size mismatch [{idx}]: {it['file']} has {im.size}, expected (2398, 827)")
            if im.format != "JPEG":
                errors.append(f"Format mismatch [{idx}]: {it['file']} is {im.format}, expected JPEG")
            if im.mode != "RGB":
                errors.append(f"Mode mismatch [{idx}]: {it['file']} is {im.mode}, expected RGB")
        except Exception as e:
            errors.append(f"Error reading [{idx}] {out_p}: {e}")

    if errors:
        print(f"FAILED: {len(errors)} errors found:")
        for err in errors:
            print(" -", err)
        return False
    else:
        print("SUCCESS: All 74 practice images exist, are valid JPEG RGB, and measure exactly 2398 x 827 px!")

    # Check old backup files
    w1_backup_dir = os.path.join(repo_root, "frontend/public/homescool/media/week1/practice-images")
    w2_backup_dir = os.path.join(repo_root, "frontend/public/homescool/media/week2/practice-images")
    subjects = ["teb", "exe", "LT", "his", "geo", "art", "mat", "esp", "ing", "lat", "cie", "pro"]
    for s in subjects:
        p1 = os.path.join(w1_backup_dir, f"{s}-c3-w1-practice.jpg")
        p2 = os.path.join(w2_backup_dir, f"{s}-c3-w2-practice.jpg")
        assert os.path.exists(p1), f"Backup missing: {p1}"
        assert os.path.exists(p2), f"Backup missing: {p2}"
    print("All backup {materia}-c3-w{N}-practice.jpg files verified intact!")
    return True

if __name__ == "__main__":
    verify_all()
