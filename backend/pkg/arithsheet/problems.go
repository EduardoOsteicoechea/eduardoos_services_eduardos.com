package arithsheet

import "math/rand"

// Factors is a two-digit pair. A is the top number, B the bottom number.
type Factors struct {
	A int
	B int
}

// SampleFactors returns 32 multiplications and 32 divisions from a fixed seed.
// Division keeps the dividend greater than or equal to the divisor.
func SampleFactors(seed int64) (mult, div []Factors) {
	rng := rand.New(rand.NewSource(seed))
	mult = make([]Factors, gridCols*gridRows)
	for i := range mult {
		mult[i] = Factors{A: twoDigit(rng), B: twoDigit(rng)}
	}
	div = make([]Factors, gridCols*gridRows)
	for i := range div {
		b := twoDigit(rng)
		span := 100 - b // b..99 inclusive
		div[i] = Factors{A: b + rng.Intn(span), B: b}
	}
	return mult, div
}

func twoDigit(rng *rand.Rand) int {
	return 10 + rng.Intn(90)
}
