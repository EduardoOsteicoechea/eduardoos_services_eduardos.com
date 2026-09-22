package main

import (
	"encoding/json"
	"fmt"
	"strings"
)

// ereportAPIWriteError is returned by API-key merge/replace validation with a stable machine code.
type ereportAPIWriteError struct {
	Code   string
	Detail string
}

func (e *ereportAPIWriteError) Error() string {
	if e == nil {
		return ""
	}
	if e.Detail == "" {
		return e.Code
	}
	return e.Code + ": " + e.Detail
}

func apiWriteErr(code, detail string) error {
	return &ereportAPIWriteError{Code: code, Detail: detail}
}

func asAPIWriteErr(err error) *ereportAPIWriteError {
	if err == nil {
		return nil
	}
	if e, ok := err.(*ereportAPIWriteError); ok {
		return e
	}
	return &ereportAPIWriteError{Code: "invalid_request", Detail: err.Error()}
}

func mergeAPIPayload(stored, incoming map[string]any) (map[string]any, error) {
	if incoming == nil {
		return nil, apiWriteErr("invalid_request", "payload required")
	}
	base := stored
	if base == nil {
		base = emptyEreportPayload()
	}
	healEreportChecklistLegacy(base)
	out := deepCloneMap(base)

	for k, v := range incoming {
		if k == "sections" {
			continue
		}
		out[k] = deepCloneAny(v)
	}

	storedSecs := asMapSlice(base["sections"])
	incomingSecs := asMapSlice(incoming["sections"])
	storedSecByID := indexByID(storedSecs)

	resultSecs := make([]any, 0, len(storedSecs)+len(incomingSecs))
	for _, s := range storedSecs {
		resultSecs = append(resultSecs, deepCloneMap(s))
	}
	resultSecByID := indexByID(asMapSlice(resultSecs))

	for _, inSec := range incomingSecs {
		sid := strings.TrimSpace(asString(inSec["id"]))
		if sid == "" {
			return nil, apiWriteErr("invalid_request", "section id required")
		}
		storedSec, exists := storedSecByID[sid]
		if !exists {
			if err := validateNewSection(inSec); err != nil {
				return nil, err
			}
			resultSecs = append(resultSecs, deepCloneMap(inSec))
			resultSecByID[sid] = inSec
			continue
		}
		if err := assertUnchangedMeta(storedSec, inSec, []string{"title", "kind"}, "section "+sid); err != nil {
			return nil, err
		}
		mergedSec := resultSecByID[sid]
		if mergedSec == nil {
			return nil, apiWriteErr("internal_error", "missing section "+sid)
		}
		mergedGroups, err := mergeGroups(asMapSlice(storedSec["groups"]), asMapSlice(inSec["groups"]), asMapSlice(mergedSec["groups"]))
		if err != nil {
			return nil, err
		}
		mergedSec["groups"] = mergedGroups
	}

	out["sections"] = resultSecs
	healEreportChecklistLegacy(out)
	return out, nil
}

func mergeGroups(storedGroups, incomingGroups, resultGroups []map[string]any) ([]any, error) {
	storedByID := indexByID(storedGroups)
	resultByID := indexByID(resultGroups)
	out := make([]any, 0, len(resultGroups)+len(incomingGroups))
	for _, g := range resultGroups {
		out = append(out, g)
	}

	for _, inGrp := range incomingGroups {
		gid := strings.TrimSpace(asString(inGrp["id"]))
		if gid == "" {
			return nil, apiWriteErr("invalid_request", "group id required")
		}
		storedGrp, exists := storedByID[gid]
		if !exists {
			if err := validateNewGroup(inGrp); err != nil {
				return nil, err
			}
			out = append(out, deepCloneMap(inGrp))
			resultByID[gid] = inGrp
			continue
		}
		if err := assertUnchangedMeta(storedGrp, inGrp, []string{"title"}, "group "+gid); err != nil {
			return nil, err
		}
		mergedGrp := resultByID[gid]
		if mergedGrp == nil {
			return nil, apiWriteErr("internal_error", "missing group "+gid)
		}
		mergedItems, err := mergeItems(asMapSlice(storedGrp["items"]), asMapSlice(inGrp["items"]), asMapSlice(mergedGrp["items"]))
		if err != nil {
			return nil, err
		}
		mergedGrp["items"] = mergedItems
	}
	return out, nil
}

func mergeItems(storedItems, incomingItems, resultItems []map[string]any) ([]any, error) {
	storedByID := indexByID(storedItems)
	resultByID := indexByID(resultItems)
	out := make([]any, 0, len(resultItems)+len(incomingItems))
	for _, it := range resultItems {
		out = append(out, it)
	}

	for _, inItem := range incomingItems {
		iid := strings.TrimSpace(asString(inItem["id"]))
		if iid == "" {
			return nil, apiWriteErr("invalid_request", "item id required")
		}
		storedItem, exists := storedByID[iid]
		if !exists {
			if err := validateNewAPIItem(inItem); err != nil {
				return nil, err
			}
			if _, dup := resultByID[iid]; dup {
				return nil, apiWriteErr("invalid_request", "duplicate new item id "+iid)
			}
			out = append(out, deepCloneMap(inItem))
			resultByID[iid] = inItem
			continue
		}
		inCmp := deepCloneMap(inItem)
		healEreportItemsChecklist([]map[string]any{inCmp})
		if !jsonEqual(storedItem, inCmp) {
			return nil, apiWriteErr("append_existing_item_modified", "cannot modify existing issue "+iid)
		}
	}
	return out, nil
}

func validateNewAPIItem(it map[string]any) error {
	text := strings.TrimSpace(asString(it["incidencia"]))
	if text == "" {
		return apiWriteErr("append_invalid_new_item_status", "new issues require non-empty incidencia text")
	}
	status := asString(it["status"])
	if status != "reprobado" {
		return apiWriteErr("append_invalid_new_item_status", "new issues must have status reprobado")
	}
	// New API items must carry an unchecked UX row so legacy heal does not flip them to aprobado.
	if checklistLen(it["checklist"]) == 0 {
		it["checklist"] = []any{
			map[string]any{
				"id":      "ux-test",
				"label":   "UX Test",
				"checked": false,
			},
		}
	}
	return nil
}

func validateNewSection(sec map[string]any) error {
	for _, g := range asMapSlice(sec["groups"]) {
		if err := validateNewGroup(g); err != nil {
			return err
		}
	}
	return nil
}

func validateNewGroup(g map[string]any) error {
	for _, it := range asMapSlice(g["items"]) {
		if err := validateNewAPIItem(it); err != nil {
			return err
		}
	}
	return nil
}

func assertUnchangedMeta(stored, incoming map[string]any, keys []string, label string) error {
	for _, k := range keys {
		if _, ok := incoming[k]; !ok {
			continue
		}
		if asString(stored[k]) != asString(incoming[k]) {
			return apiWriteErr("append_existing_item_modified", fmt.Sprintf("cannot modify %s field %s", label, k))
		}
	}
	return nil
}

// prepareReplacePayload validates and clones a full .ereport payload for mode=replace.
// Stub template sections/items are not preserved unless present in incoming.
func prepareReplacePayload(incoming map[string]any) (map[string]any, error) {
	if incoming == nil {
		return nil, apiWriteErr("invalid_request", "payload required")
	}
	out := deepCloneMap(incoming)
	if _, ok := out["sections"]; !ok {
		out["sections"] = []any{}
	}
	secs := asMapSlice(out["sections"])
	if out["sections"] != nil && secs == nil {
		if _, isArr := out["sections"].([]any); !isArr {
			if _, isTyped := out["sections"].([]map[string]any); !isTyped {
				return nil, apiWriteErr("invalid_request", "payload.sections must be an array")
			}
		}
	}
	for _, sec := range secs {
		sid := strings.TrimSpace(asString(sec["id"]))
		if sid == "" {
			return nil, apiWriteErr("invalid_request", "section id required")
		}
		for _, g := range asMapSlice(sec["groups"]) {
			gid := strings.TrimSpace(asString(g["id"]))
			if gid == "" {
				return nil, apiWriteErr("invalid_request", "group id required")
			}
			for _, it := range asMapSlice(g["items"]) {
				iid := strings.TrimSpace(asString(it["id"]))
				if iid == "" {
					return nil, apiWriteErr("invalid_request", "item id required")
				}
				if err := validateReplaceItemStatus(it); err != nil {
					return nil, err
				}
			}
		}
	}
	if out["validationCriteria"] == nil {
		out["validationCriteria"] = []any{}
	}
	if strings.TrimSpace(asString(out["appTitle"])) == "" {
		out["appTitle"] = "Issue Tracker"
	}
	healEreportChecklistLegacy(out)
	return out, nil
}

func validateReplaceItemStatus(it map[string]any) error {
	status := asString(it["status"])
	switch status {
	case "", "aprobado", "reprobado", "no_aplica":
		return nil
	default:
		return apiWriteErr("invalid_request", "item status must be aprobado|reprobado|no_aplica|empty")
	}
}

func indexByID(rows []map[string]any) map[string]map[string]any {
	out := make(map[string]map[string]any, len(rows))
	for _, row := range rows {
		id := strings.TrimSpace(asString(row["id"]))
		if id != "" {
			out[id] = row
		}
	}
	return out
}

func asMapSlice(v any) []map[string]any {
	arr, ok := v.([]any)
	if !ok {
		if typed, ok2 := v.([]map[string]any); ok2 {
			return typed
		}
		return nil
	}
	out := make([]map[string]any, 0, len(arr))
	for _, el := range arr {
		if m, ok := el.(map[string]any); ok {
			out = append(out, m)
		}
	}
	return out
}

func asString(v any) string {
	s, _ := v.(string)
	return s
}

func deepCloneMap(m map[string]any) map[string]any {
	if m == nil {
		return map[string]any{}
	}
	b, _ := json.Marshal(m)
	var out map[string]any
	_ = json.Unmarshal(b, &out)
	if out == nil {
		return map[string]any{}
	}
	return out
}

func deepCloneAny(v any) any {
	b, err := json.Marshal(v)
	if err != nil {
		return v
	}
	var out any
	_ = json.Unmarshal(b, &out)
	return out
}

func jsonEqual(a, b map[string]any) bool {
	ab, _ := json.Marshal(a)
	bb, _ := json.Marshal(b)
	return string(ab) == string(bb)
}

func toAnySlice(rows []map[string]any) []any {
	out := make([]any, len(rows))
	for i := range rows {
		out[i] = rows[i]
	}
	return out
}

func countEreportItems(payload map[string]any) int {
	n := 0
	for _, sec := range asMapSlice(payload["sections"]) {
		n += len(asMapSlice(sec["items"]))
		for _, g := range asMapSlice(sec["groups"]) {
			n += len(asMapSlice(g["items"]))
		}
	}
	return n
}

// collectEreportStructureIDs returns every section / group / issue id present in a payload.
func collectEreportStructureIDs(payload map[string]any) (sections, groups, items map[string]struct{}) {
	sections = map[string]struct{}{}
	groups = map[string]struct{}{}
	items = map[string]struct{}{}
	for _, sec := range asMapSlice(payload["sections"]) {
		if id := strings.TrimSpace(asString(sec["id"])); id != "" {
			sections[id] = struct{}{}
		}
		for _, it := range asMapSlice(sec["items"]) {
			if id := strings.TrimSpace(asString(it["id"])); id != "" {
				items[id] = struct{}{}
			}
		}
		for _, g := range asMapSlice(sec["groups"]) {
			if id := strings.TrimSpace(asString(g["id"])); id != "" {
				groups[id] = struct{}{}
			}
			for _, it := range asMapSlice(g["items"]) {
				if id := strings.TrimSpace(asString(it["id"])); id != "" {
					items[id] = struct{}{}
				}
			}
		}
	}
	return sections, groups, items
}

// assertInviteNoDeletes rejects invite-session saves that drop existing sections,
// groups (subsections), or issues. Guests may add and edit, but not delete.
func assertInviteNoDeletes(stored, incoming map[string]any) error {
	if stored == nil {
		return nil
	}
	if incoming == nil {
		return apiWriteErr("invalid_request", "payload required")
	}
	prevSec, prevGrp, prevItem := collectEreportStructureIDs(stored)
	nextSec, nextGrp, nextItem := collectEreportStructureIDs(incoming)
	for id := range prevSec {
		if _, ok := nextSec[id]; !ok {
			return apiWriteErr("forbidden", "guests cannot delete sections")
		}
	}
	for id := range prevGrp {
		if _, ok := nextGrp[id]; !ok {
			return apiWriteErr("forbidden", "guests cannot delete sections")
		}
	}
	for id := range prevItem {
		if _, ok := nextItem[id]; !ok {
			return apiWriteErr("forbidden", "guests cannot delete issues")
		}
	}
	return nil
}

const legacyUXCumplidasLabel = "UX cumplidas"

// healEreportChecklistLegacy seeds a checked "UX cumplidas" row on any item that
// has no UX checklist (except no_aplica), so legacy reports and corrupted
// autosaves do not all render as reprobado after checklist-derived status.
func healEreportChecklistLegacy(payload map[string]any) {
	if payload == nil {
		return
	}
	for _, sec := range asMapSlice(payload["sections"]) {
		healEreportItemsChecklist(asMapSlice(sec["items"]))
		for _, g := range asMapSlice(sec["groups"]) {
			healEreportItemsChecklist(asMapSlice(g["items"]))
		}
	}
}

func healEreportItemsChecklist(items []map[string]any) {
	for _, it := range items {
		if it == nil {
			continue
		}
		if _, ok := it["checklist"]; !ok {
			it["checklist"] = []any{}
		}
		if asString(it["status"]) == "no_aplica" {
			continue
		}
		if checklistLen(it["checklist"]) > 0 {
			continue
		}
		it["checklist"] = []any{
			map[string]any{
				"id":      "ux-cumplidas",
				"label":   legacyUXCumplidasLabel,
				"checked": true,
			},
		}
		it["status"] = "aprobado"
	}
}

func checklistLen(v any) int {
	switch t := v.(type) {
	case []any:
		return len(t)
	case []map[string]any:
		return len(t)
	default:
		return len(asMapSlice(v))
	}
}

// countEreportIssueOverview tallies open vs completed issues from checklist-derived
// status when a checklist exists; otherwise falls back to item.status.
// completed = aprobado; open = empty or reprobado; no_aplica is ignored.
func countEreportIssueOverview(payload map[string]any) (open, completed int) {
	healEreportChecklistLegacy(payload)
	tally := func(items []map[string]any) {
		for _, it := range items {
			switch itemOverviewStatus(it) {
			case "aprobado":
				completed++
			case "no_aplica":
				// neither open nor completed
			default:
				open++
			}
		}
	}
	for _, sec := range asMapSlice(payload["sections"]) {
		tally(asMapSlice(sec["items"]))
		for _, g := range asMapSlice(sec["groups"]) {
			tally(asMapSlice(g["items"]))
		}
	}
	return open, completed
}

func itemOverviewStatus(it map[string]any) string {
	list := asMapSlice(it["checklist"])
	if len(list) == 0 {
		return asString(it["status"])
	}
	checked := 0
	for _, c := range list {
		switch v := c["checked"].(type) {
		case bool:
			if v {
				checked++
			}
		case string:
			if v == "true" || v == "1" {
				checked++
			}
		}
	}
	if checked == 0 {
		return "reprobado"
	}
	if checked == len(list) {
		return "aprobado"
	}
	return ""
}
