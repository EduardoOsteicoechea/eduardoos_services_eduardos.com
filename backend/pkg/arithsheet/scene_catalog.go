package arithsheet

// sceneFigs holds one everyday drawing per plane figure, then per solid.
// art_pack.init replaces this slice with the painted catalogue.
var sceneFigs []func(*canvas, rectMm)

func shiftBox(box rectMm, x, top, w, h float64) rectMm {
	return rectMm{
		X:   box.X + x*box.W,
		Top: box.Top + top*box.H,
		W:   w * box.W,
		H:   h * box.H,
	}
}
