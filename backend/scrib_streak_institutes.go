package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
)

type institutesChapterMeta struct {
	ID             string `json:"id"`
	Order          int    `json:"order"`
	Book           string `json:"book"`
	Chapter        string `json:"chapter"`
	ParagraphCount int    `json:"paragraphCount"`
	URL            string `json:"url"`
}

type institutesIndexDoc struct {
	Chapters []institutesChapterMeta `json:"chapters"`
}

type institutesParagraph struct {
	ID    string `json:"id"`
	Order int    `json:"order"`
	Text  string `json:"text"`
}

type institutesChapterDoc struct {
	ID         string                `json:"id"`
	Paragraphs []institutesParagraph `json:"paragraphs"`
}

type institutesPack struct {
	root     string
	chapters []institutesChapterMeta
	byID     map[string]int // chapter meta id -> index
}

var (
	institutesPackMu sync.Mutex
	institutesPacks  = map[string]*institutesPack{}
)

func loadInstitutesPack(root string) (*institutesPack, error) {
	institutesPackMu.Lock()
	defer institutesPackMu.Unlock()
	if p, ok := institutesPacks[root]; ok {
		return p, nil
	}
	raw, err := os.ReadFile(filepath.Join(root, "index.json"))
	if err != nil {
		return nil, err
	}
	var idx institutesIndexDoc
	if err := json.Unmarshal(raw, &idx); err != nil {
		return nil, err
	}
	chapters := append([]institutesChapterMeta{}, idx.Chapters...)
	sort.SliceStable(chapters, func(i, j int) bool {
		return chapters[i].Order < chapters[j].Order
	})
	byID := make(map[string]int, len(chapters))
	for i, ch := range chapters {
		byID[ch.ID] = i
	}
	p := &institutesPack{root: root, chapters: chapters, byID: byID}
	institutesPacks[root] = p
	return p, nil
}

func resetInstitutesOrderCacheForTests() {
	institutesPackMu.Lock()
	defer institutesPackMu.Unlock()
	institutesPacks = map[string]*institutesPack{}
}

func (p *institutesPack) chapterPath(ch institutesChapterMeta) string {
	rel := strings.TrimSpace(ch.URL)
	if rel == "" {
		rel = filepath.ToSlash(filepath.Join("chapters", ch.Book, ch.Chapter+".json"))
	}
	return filepath.Join(p.root, filepath.FromSlash(rel))
}

func (p *institutesPack) loadChapter(ch institutesChapterMeta) ([]institutesParagraph, error) {
	raw, err := os.ReadFile(p.chapterPath(ch))
	if err != nil {
		return nil, err
	}
	var doc institutesChapterDoc
	if err := json.Unmarshal(raw, &doc); err != nil {
		return nil, err
	}
	paras := append([]institutesParagraph{}, doc.Paragraphs...)
	sort.SliceStable(paras, func(i, j int) bool {
		return paras[i].Order < paras[j].Order
	})
	return paras, nil
}

func (p *institutesPack) findParagraph(paragraphID string) (chIdx, paraIdx int, paras []institutesParagraph, err error) {
	paragraphID = strings.TrimSpace(paragraphID)
	if paragraphID == "" {
		if len(p.chapters) == 0 {
			return 0, 0, nil, fmt.Errorf("institutes pack empty")
		}
		paras, err = p.loadChapter(p.chapters[0])
		if err != nil {
			return 0, 0, nil, err
		}
		if len(paras) == 0 {
			return 0, 0, nil, fmt.Errorf("institutes pack empty")
		}
		return 0, 0, paras, nil
	}
	// Prefer chapter id prefix: I.I.2 -> chapter I.I
	parts := strings.Split(paragraphID, ".")
	if len(parts) >= 2 {
		chID := parts[0] + "." + parts[1]
		if idx, ok := p.byID[chID]; ok {
			paras, err = p.loadChapter(p.chapters[idx])
			if err != nil {
				return 0, 0, nil, err
			}
			for i, para := range paras {
				if para.ID == paragraphID {
					return idx, i, paras, nil
				}
			}
		}
	}
	// Fallback scan (small packs / odd ids).
	for i, ch := range p.chapters {
		paras, err = p.loadChapter(ch)
		if err != nil {
			return 0, 0, nil, err
		}
		for j, para := range paras {
			if para.ID == paragraphID {
				return i, j, paras, nil
			}
		}
	}
	return 0, 0, nil, fmt.Errorf("unknown paragraph")
}

func listInstitutesUnits(root string, cursor scribStreakInstitutesCursor, quantity int) ([]scribStreakAssignmentUnit, scribStreakInstitutesCursor, error) {
	if quantity < 1 {
		quantity = 1
	}
	pack, err := loadInstitutesPack(root)
	if err != nil {
		return nil, cursor, err
	}
	chIdx, paraIdx, paras, err := pack.findParagraph(cursor.ParagraphID)
	if err != nil {
		return nil, cursor, err
	}
	units := make([]scribStreakAssignmentUnit, 0, quantity)
	for n := 0; n < quantity; n++ {
		if paraIdx >= len(paras) {
			chIdx++
			if chIdx >= len(pack.chapters) {
				return nil, cursor, fmt.Errorf("end of institutes")
			}
			paras, err = pack.loadChapter(pack.chapters[chIdx])
			if err != nil {
				return nil, cursor, err
			}
			paraIdx = 0
			if len(paras) == 0 {
				return nil, cursor, fmt.Errorf("end of institutes")
			}
		}
		id := paras[paraIdx].ID
		units = append(units, scribStreakAssignmentUnit{
			Kind:        scribStreakKindInstitutes,
			ParagraphID: id,
			Label:       "Institutes " + id,
		})
		paraIdx++
	}
	next := scribStreakInstitutesCursor{}
	if paraIdx < len(paras) {
		next.ParagraphID = paras[paraIdx].ID
	} else {
		nextCh := chIdx + 1
		for nextCh < len(pack.chapters) {
			nextParas, err := pack.loadChapter(pack.chapters[nextCh])
			if err != nil {
				return nil, cursor, err
			}
			if len(nextParas) > 0 {
				next.ParagraphID = nextParas[0].ID
				break
			}
			nextCh++
		}
		if next.ParagraphID == "" && len(units) > 0 {
			next.ParagraphID = units[len(units)-1].ParagraphID
		}
	}
	return units, next, nil
}
