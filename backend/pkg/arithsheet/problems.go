package arithsheet

import "math/rand"

// Factors is a two-digit pair. A is the top number, B the bottom number.
type Factors struct {
	A int
	B int
}

// SampleFactors returns one multiplication and one division per arithmetic cell.
// Division is a two-digit dividend over a one-digit divisor (2–9).
func SampleFactors(seed int64) (mult, div []Factors) {
	rng := rand.New(rand.NewSource(seed))
	n := arithGridCols * arithGridRows
	mult = make([]Factors, n)
	for i := range mult {
		mult[i] = Factors{A: twoDigit(rng), B: twoDigit(rng)}
	}
	div = make([]Factors, n)
	for i := range div {
		div[i] = Factors{A: twoDigit(rng), B: 2 + rng.Intn(8)}
	}
	return mult, div
}

// SampleClass is the starter sheet: new two-digit multiplications and exact
// one-digit divisions (both numbers from 2–9, dividend divisible by the divisor).
func SampleClass(seed int64) (mult, div []Factors) {
	rng := rand.New(rand.NewSource(seed))
	n := arithGridCols * arithGridRows
	mult = make([]Factors, n)
	for i := range mult {
		mult[i] = Factors{A: twoDigit(rng), B: twoDigit(rng)}
	}
	div = oneDigitDivisions(rng, n)
	return mult, div
}

func oneDigitDivisions(rng *rand.Rand, n int) []Factors {
	pool := exactOneDigitDivisions()
	out := make([]Factors, 0, n)
	for len(out) < n {
		rng.Shuffle(len(pool), func(i, j int) {
			pool[i], pool[j] = pool[j], pool[i]
		})
		out = append(out, pool...)
	}
	return out[:n]
}

func exactOneDigitDivisions() []Factors {
	out := make([]Factors, 0, 16)
	for b := 2; b <= 9; b++ {
		for a := b; a <= 9; a += b {
			out = append(out, Factors{A: a, B: b})
		}
	}
	return out
}

func twoDigit(rng *rand.Rand) int {
	return 10 + rng.Intn(90)
}
