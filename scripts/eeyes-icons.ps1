# Regenerates eEyes Android/Desktop icons and splash images from the site favicon.
# Usage (repo root): powershell -ExecutionPolicy Bypass -File scripts/eeyes-icons.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root "frontend/public/favicon-192.png"
$res = Join-Path $root "android/app/src/main/res"
$desk = Join-Path $root "desktop/eEyes.Desktop/Assets"

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class EeyesIcons
{
    // The favicon only exists at 192px: upscale, then re-steepen the antialias ramps so edges stay crisp.
    public static Bitmap Master(string src, int size)
    {
        // The disc touches the favicon edges: work on a padded canvas so the blur does not flatten it.
        int pad = size / 16;
        using (var s = new Bitmap(src))
        using (var up = new Bitmap(size + 2 * pad, size + 2 * pad, PixelFormat.Format32bppArgb))
        {
            using (var g = Graphics.FromImage(up))
            {
                g.Clear(Color.Transparent);
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                g.DrawImage(s, new Rectangle(pad, pad, size, size));
            }
            Map(up, (r, g, b, a) => new[] { r * a / 255.0, g * a / 255.0, b * a / 255.0, a });
            int radius = size / 192 + 1;
            for (int pass = 0; pass < 3; pass++) Blur(up, radius);
            Map(up, (r, g, b, a) =>
            {
                double v = Sharp((r + g + b) / 765.0) * 255;
                return new[] { v, v, v, Sharp(a / 255.0) * 255 };
            });
            return up.Clone(new Rectangle(pad, pad, size, size), PixelFormat.Format32bppArgb);
        }
    }

    // White glyph only (black disc removed) for monochrome / notification icons.
    public static Bitmap Glyph(Bitmap master)
    {
        var g = (Bitmap)master.Clone();
        Map(g, (r, gg, b, a) => new[] { 255.0, 255.0, 255.0, a * ((r + gg + b) / 765.0) });
        return g;
    }

    static double Sharp(double x)
    {
        double t = (x - 0.5) * 6 + 0.5;
        return t < 0 ? 0 : t > 1 ? 1 : t;
    }

    // Separable box blur on all channels; repeated passes approximate a gaussian that rounds off source pixel steps.
    static void Blur(Bitmap bmp, int r)
    {
        int w = bmp.Width, h = bmp.Height;
        var rect = new Rectangle(0, 0, w, h);
        var data = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        var buf = new byte[data.Stride * h];
        Marshal.Copy(data.Scan0, buf, 0, buf.Length);
        var tmp = new byte[buf.Length];
        for (int dir = 0; dir < 2; dir++)
        {
            for (int y = 0; y < h; y++)
                for (int x = 0; x < w; x++)
                    for (int c = 0; c < 4; c++)
                    {
                        int sum = 0, n = 0;
                        for (int k = -r; k <= r; k++)
                        {
                            int xx = dir == 0 ? x + k : x, yy = dir == 0 ? y : y + k;
                            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
                            sum += buf[yy * data.Stride + xx * 4 + c];
                            n++;
                        }
                        tmp[y * data.Stride + x * 4 + c] = (byte)(sum / n);
                    }
            Array.Copy(tmp, buf, buf.Length);
        }
        Marshal.Copy(buf, 0, data.Scan0, buf.Length);
        bmp.UnlockBits(data);
    }

    static void Map(Bitmap bmp, Func<int, int, int, int, double[]> f)
    {
        var rect = new Rectangle(0, 0, bmp.Width, bmp.Height);
        var data = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        var buf = new byte[data.Stride * bmp.Height];
        Marshal.Copy(data.Scan0, buf, 0, buf.Length);
        for (int i = 0; i < buf.Length; i += 4)
        {
            var o = f(buf[i + 2], buf[i + 1], buf[i], buf[i + 3]);
            buf[i] = (byte)Math.Round(o[2]);
            buf[i + 1] = (byte)Math.Round(o[1]);
            buf[i + 2] = (byte)Math.Round(o[0]);
            buf[i + 3] = (byte)Math.Round(o[3]);
        }
        Marshal.Copy(buf, 0, data.Scan0, buf.Length);
        bmp.UnlockBits(data);
    }

    public static Bitmap Compose(Bitmap img, int canvas, int content)
    {
        var bmp = new Bitmap(canvas, canvas, PixelFormat.Format32bppArgb);
        using (var g = Graphics.FromImage(bmp))
        {
            g.Clear(Color.Transparent);
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.SmoothingMode = SmoothingMode.HighQuality;
            int off = (canvas - content) / 2;
            g.DrawImage(img, new Rectangle(off, off, content, content));
        }
        return bmp;
    }

    public static void SavePng(Bitmap img, int canvas, int content, string path)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path));
        using (var bmp = Compose(img, canvas, content)) bmp.Save(path, ImageFormat.Png);
    }

    public static void SaveIco(Bitmap img, int[] sizes, string path)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path));
        var pngs = new List<byte[]>();
        foreach (var s in sizes)
            using (var bmp = Compose(img, s, s))
            using (var ms = new MemoryStream())
            {
                bmp.Save(ms, ImageFormat.Png);
                pngs.Add(ms.ToArray());
            }
        using (var fs = File.Create(path))
        using (var w = new BinaryWriter(fs))
        {
            w.Write((short)0); w.Write((short)1); w.Write((short)sizes.Length);
            int offset = 6 + 16 * sizes.Length;
            for (int i = 0; i < sizes.Length; i++)
            {
                w.Write((byte)(sizes[i] >= 256 ? 0 : sizes[i]));
                w.Write((byte)(sizes[i] >= 256 ? 0 : sizes[i]));
                w.Write((byte)0); w.Write((byte)0);
                w.Write((short)1); w.Write((short)32);
                w.Write(pngs[i].Length); w.Write(offset);
                offset += pngs[i].Length;
            }
            foreach (var p in pngs) w.Write(p);
        }
    }
}
"@

$master = [EeyesIcons]::Master($src, 1024)
$glyph = [EeyesIcons]::Glyph($master)
$densities = @{ "mdpi" = 1; "hdpi" = 1.5; "xhdpi" = 2; "xxhdpi" = 3; "xxxhdpi" = 4 }

foreach ($d in $densities.GetEnumerator()) {
    $k = $d.Value
    $px = { param($dp) [int][math]::Round($dp * $k) }
    # Adaptive icon layers: 108dp canvas, favicon disc 72dp (glyph inside the 66dp safe zone).
    [EeyesIcons]::SavePng($master, (& $px 108), (& $px 72), "$res/mipmap-$($d.Key)/ic_launcher_foreground.png")
    [EeyesIcons]::SavePng($glyph, (& $px 108), (& $px 72), "$res/mipmap-$($d.Key)/ic_launcher_monochrome.png")
    # Splash icon without background: 288dp canvas, content inside the 192dp circle.
    [EeyesIcons]::SavePng($master, (& $px 288), (& $px 160), "$res/drawable-$($d.Key)/splash_icon.png")
    # Status-bar icon: white glyph, 24dp canvas.
    [EeyesIcons]::SavePng($glyph, (& $px 24), (& $px 30), "$res/drawable-$($d.Key)/ic_stat_eeyes.png")
}

[EeyesIcons]::SaveIco($master, @(16, 20, 24, 32, 40, 48, 64, 96, 128, 256), "$desk/eEyes.ico")
[EeyesIcons]::SavePng($master, 256, 256, "$desk/splash.png")

$master.Dispose()
$glyph.Dispose()
Write-Host "eEyes icons regenerated."
