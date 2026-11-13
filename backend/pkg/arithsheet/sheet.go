package arithsheet

// BuildSample returns the two-sheet worksheet PDF.
func BuildSample() []byte {
	pdf, _, _ := renderSample()
	return pdf
}

func renderSample() (pdf []byte, arith, figures string) {
	mult, div := SampleFactors(sampleSeed)
	arith = renderArith(mult, div)
	figures = renderFigures()
	return assemble([]string{arith, figures}), arith, figures
}
