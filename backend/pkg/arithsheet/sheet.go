package arithsheet

// BuildSample returns the three-sheet worksheet PDF.
func BuildSample() []byte {
	pdf, _, _ := renderSample()
	return pdf
}

func renderSample() (pdf []byte, arith, figures string) {
	mult, div := SampleFactors(sampleSeed)
	arith = renderArith(mult, div)
	var solids []sheetImage
	figures, solids = renderFigures()
	sceneContent, scenes := renderScenes(sampleSeed)
	return assembleDocs([]pageDoc{
		{content: arith},
		{content: figures, images: solids},
		{content: sceneContent, images: scenes},
	}), arith, figures
}

// BuildClass is the next worksheet. Divisions are exact one-digit problems.
// Multiplications, the figure sheet, and the object puzzles use a new shuffle.
func BuildClass() []byte {
	pdf, _, _ := renderClass()
	return pdf
}

func renderClass() (pdf []byte, arith, figures string) {
	mult, div := SampleClass(classSeed)
	arith = renderArith(mult, div)
	var solids []sheetImage
	figures, solids = renderFiguresScrambled(classSeed)
	sceneContent, scenes := renderScenes(classSeed + 53)
	return assembleDocs([]pageDoc{
		{content: arith},
		{content: figures, images: solids},
		{content: sceneContent, images: scenes},
	}), arith, figures
}
