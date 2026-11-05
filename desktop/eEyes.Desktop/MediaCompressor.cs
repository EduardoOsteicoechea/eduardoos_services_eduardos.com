using System.Drawing;
using System.Drawing.Imaging;
using System.Security.Cryptography;

namespace eEyes.Desktop;

internal static class MediaCompressor
{
    public static byte[] CompressJpeg(byte[] source, int maxEdge = 1600, long quality = 70L)
    {
        using var ms = new MemoryStream(source);
        using var img = Image.FromStream(ms);
        var maxSide = Math.Max(img.Width, img.Height);
        var scale = maxSide > maxEdge ? maxEdge / (double)maxSide : 1.0;
        var w = Math.Max(1, (int)(img.Width * scale));
        var h = Math.Max(1, (int)(img.Height * scale));
        using var bmp = new Bitmap(w, h);
        using (var g = Graphics.FromImage(bmp))
        {
            g.DrawImage(img, 0, 0, w, h);
        }
        var jpegCodec = ImageCodecInfo.GetImageEncoders().First(c => c.FormatID == ImageFormat.Jpeg.Guid);
        using var enc = new EncoderParameters(1);
        enc.Param[0] = new EncoderParameter(Encoder.Quality, quality);
        using var outMs = new MemoryStream();
        bmp.Save(outMs, jpegCodec, enc);
        return outMs.ToArray();
    }

    public static string Sha256Hex(byte[] bytes)
    {
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
