package main

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestEostoreAdminCatalogLifecycle(t *testing.T) {
	app := newTestApp(true)
	app.cfg.AdminEmail = "admin@eduardoos.com"

	deny := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/eostore/companies", `{"name":"Acme","id":"acme"}`)
	if deny.Code != http.StatusForbidden {
		t.Fatalf("member create company status=%d body=%s", deny.Code, deny.Body.String())
	}

	co := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/companies", `{"name":"Acme Store","id":"acme","description":"Main"}`)
	if co.Code != http.StatusOK {
		t.Fatalf("create company status=%d body=%s", co.Code, co.Body.String())
	}
	company := decodeMap(t, co)["company"].(map[string]any)
	companyGUID, _ := company["guid"].(string)
	if companyGUID == "" || company["id"] != "acme" {
		t.Fatalf("unexpected company: %#v", company)
	}

	sec := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/sections", `{"company_guid":"`+companyGUID+`","name":"Textiles","id":"textiles"}`)
	if sec.Code != http.StatusOK {
		t.Fatalf("create section status=%d body=%s", sec.Code, sec.Body.String())
	}
	section := decodeMap(t, sec)["section"].(map[string]any)
	sectionGUID, _ := section["guid"].(string)

	typ := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/types", `{"section_guid":"`+sectionGUID+`","name":"Towels","id":"towels"}`)
	if typ.Code != http.StatusOK {
		t.Fatalf("create type status=%d body=%s", typ.Code, typ.Body.String())
	}
	typeObj := decodeMap(t, typ)["type"].(map[string]any)
	typeGUID, _ := typeObj["guid"].(string)

	badDiscount := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/products", `{
		"type_guid":"`+typeGUID+`",
		"name":"Beach Towel",
		"id":"beach-towel",
		"price_base_usd":20,
		"discount_percent":7,
		"bs_per_usd":40,
		"units":5,
		"visible":true,
		"hashtags":["coast","#soft"]
	}`)
	if badDiscount.Code != http.StatusBadRequest {
		t.Fatalf("expected invalid discount, got %d %s", badDiscount.Code, badDiscount.Body.String())
	}

	prod := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/products", `{
		"type_guid":"`+typeGUID+`",
		"name":"Beach Towel",
		"id":"beach-towel",
		"description":"Soft cotton",
		"price_base_usd":20,
		"discount_percent":25,
		"bs_per_usd":40,
		"units":5,
		"visible":true,
		"hashtags":["coast","#soft"]
	}`)
	if prod.Code != http.StatusOK {
		t.Fatalf("create product status=%d body=%s", prod.Code, prod.Body.String())
	}
	product := decodeMap(t, prod)["product"].(map[string]any)
	guid, _ := product["guid"].(string)
	if guid == "" || product["id"] != "beach-towel" {
		t.Fatalf("unexpected product: %#v", product)
	}
	if product["price_final_usd"].(float64) != 15 {
		t.Fatalf("expected final usd 15, got %#v", product["price_final_usd"])
	}
	if product["price_bs"].(float64) != 600 {
		t.Fatalf("expected price_bs 600, got %#v", product["price_bs"])
	}

	seed := httptest.NewRecorder()
	sess, err := app.issueSession(seed, app.mustUser("admin@eduardoos.com"))
	if err != nil {
		t.Fatal(err)
	}
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	part, err := w.CreateFormFile("file", "towel.png")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write(testPNGBytes(t)); err != nil {
		t.Fatal(err)
	}
	_ = w.Close()
	req := httptest.NewRequest(http.MethodPost, "/api/eostore/products/"+guid+"/images", &body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", sess.CSRF)
	copyCookies(req, seed)
	rr := httptest.NewRecorder()
	app.Handler().ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("upload image status=%d body=%s", rr.Code, rr.Body.String())
	}
	uploaded := decodeMap(t, rr)["product"].(map[string]any)
	images, _ := uploaded["images"].([]any)
	if len(images) != 1 {
		t.Fatalf("expected 1 image, got %#v", uploaded["images"])
	}
	img := images[0].(map[string]any)
	imageID, _ := img["id"].(string)
	imageURL, _ := img["url"].(string)
	if imageID == "" || imageURL == "" {
		t.Fatalf("unexpected image: %#v", img)
	}

	getImg := app.doJSON(t, "admin@eduardoos.com", http.MethodGet, imageURL, "")
	if getImg.Code != http.StatusOK || getImg.Body.Len() < 8 {
		t.Fatalf("get image status=%d len=%d", getImg.Code, getImg.Body.Len())
	}
	memberImg := app.doJSON(t, "member@eduardoos.com", http.MethodGet, imageURL, "")
	if memberImg.Code != http.StatusForbidden {
		t.Fatalf("member image get status=%d", memberImg.Code)
	}

	del := app.doJSON(t, "admin@eduardoos.com", http.MethodDelete, "/api/eostore/products/"+guid+"/images/"+imageID, "")
	if del.Code != http.StatusOK {
		t.Fatalf("delete image status=%d body=%s", del.Code, del.Body.String())
	}

	list := app.doJSON(t, "admin@eduardoos.com", http.MethodGet, "/api/eostore/products?company_guid="+companyGUID, "")
	if list.Code != http.StatusOK {
		t.Fatalf("list products status=%d", list.Code)
	}
	listed := decodeMap(t, list)
	if int(listed["count"].(float64)) != 1 {
		t.Fatalf("expected 1 product, got %#v", listed)
	}

	dup := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/products", `{
		"type_guid":"`+typeGUID+`",
		"name":"Other",
		"id":"beach-towel",
		"price_base_usd":10,
		"discount_percent":0,
		"bs_per_usd":40,
		"units":1,
		"visible":false
	}`)
	if dup.Code != http.StatusConflict {
		t.Fatalf("expected friendly id conflict, got %d %s", dup.Code, dup.Body.String())
	}
}

func TestEostoreDiscountSteps(t *testing.T) {
	if !eostoreDiscountValid(0) || !eostoreDiscountValid(100) || !eostoreDiscountValid(35) {
		t.Fatal("expected 5% steps valid")
	}
	if eostoreDiscountValid(7) || eostoreDiscountValid(-5) || eostoreDiscountValid(105) {
		t.Fatal("expected invalid discounts rejected")
	}
	p := &EostoreProduct{PriceBaseUSD: 100, DiscountPercent: 20, BsPerUSD: 36.5}
	if roundMoney(p.priceFinalUSD()) != 80 {
		t.Fatalf("final usd=%v", p.priceFinalUSD())
	}
	if roundMoney(p.priceBs()) != 2920 {
		t.Fatalf("price bs=%v", p.priceBs())
	}
}

func TestEostoreDescribeRequiresImageAndAdmin(t *testing.T) {
	app := newTestApp(true)
	app.cfg.AdminEmail = "admin@eduardoos.com"
	bot := app.chat["deepseek"].(*recordingChat)
	bot.text = "Toalla suave de algodón ideal para la playa."

	co := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/companies", `{"name":"Acme","id":"acme"}`)
	companyGUID := decodeMap(t, co)["company"].(map[string]any)["guid"].(string)
	sec := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/sections", `{"company_guid":"`+companyGUID+`","name":"Textiles","id":"textiles"}`)
	sectionGUID := decodeMap(t, sec)["section"].(map[string]any)["guid"].(string)
	typ := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/types", `{"section_guid":"`+sectionGUID+`","name":"Towels","id":"towels"}`)
	typeGUID := decodeMap(t, typ)["type"].(map[string]any)["guid"].(string)
	prod := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/products", `{
		"type_guid":"`+typeGUID+`","name":"Beach Towel","id":"beach-towel",
		"price_base_usd":20,"discount_percent":0,"bs_per_usd":40,"units":3,"visible":true
	}`)
	guid := decodeMap(t, prod)["product"].(map[string]any)["guid"].(string)

	noImg := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/products/"+guid+"/describe", `{"word_count":50}`)
	if noImg.Code != http.StatusBadRequest {
		t.Fatalf("expected describe without image 400, got %d %s", noImg.Code, noImg.Body.String())
	}

	seed := httptest.NewRecorder()
	sess, err := app.issueSession(seed, app.mustUser("admin@eduardoos.com"))
	if err != nil {
		t.Fatal(err)
	}
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	part, err := w.CreateFormFile("file", "towel.png")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write(testPNGBytes(t)); err != nil {
		t.Fatal(err)
	}
	_ = w.Close()
	req := httptest.NewRequest(http.MethodPost, "/api/eostore/products/"+guid+"/images", &body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", sess.CSRF)
	copyCookies(req, seed)
	rr := httptest.NewRecorder()
	app.Handler().ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("upload status=%d body=%s", rr.Code, rr.Body.String())
	}

	member := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/eostore/products/"+guid+"/describe", `{"word_count":50}`)
	if member.Code != http.StatusForbidden {
		t.Fatalf("member describe status=%d", member.Code)
	}

	badWords := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/products/"+guid+"/describe", `{"word_count":10}`)
	if badWords.Code != http.StatusBadRequest {
		t.Fatalf("short word_count status=%d", badWords.Code)
	}

	beforeCalls := bot.calls
	ok := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/products/"+guid+"/describe", `{"word_count":50}`)
	if ok.Code != http.StatusOK {
		t.Fatalf("describe status=%d body=%s", ok.Code, ok.Body.String())
	}
	payload := decodeMap(t, ok)
	if payload["description"] != bot.text {
		t.Fatalf("unexpected description %#v", payload["description"])
	}
	product := payload["product"].(map[string]any)
	if product["description"] != bot.text {
		t.Fatalf("product description not saved %#v", product["description"])
	}
	if !bot.lastVision || bot.calls != beforeCalls+1 || bot.lastImage == 0 {
		t.Fatalf("expected vision call, vision=%v calls=%d image=%d", bot.lastVision, bot.calls, bot.lastImage)
	}
	if !strings.Contains(bot.last, "Acme") || !strings.Contains(bot.last, "Textiles") || !strings.Contains(bot.last, "Towels") || !strings.Contains(bot.last, "Beach Towel") {
		t.Fatalf("prompt missing catalog context: %q", bot.last)
	}
}

func eostoreUploadImage(t *testing.T, app *App, guid string) string {
	t.Helper()
	seed := httptest.NewRecorder()
	sess, err := app.issueSession(seed, app.mustUser("admin@eduardoos.com"))
	if err != nil {
		t.Fatal(err)
	}
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	part, err := w.CreateFormFile("file", "p.png")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write(testPNGBytes(t)); err != nil {
		t.Fatal(err)
	}
	_ = w.Close()
	req := httptest.NewRequest(http.MethodPost, "/api/eostore/products/"+guid+"/images", &body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", sess.CSRF)
	copyCookies(req, seed)
	rr := httptest.NewRecorder()
	app.Handler().ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("upload image status=%d body=%s", rr.Code, rr.Body.String())
	}
	imgs := decodeMap(t, rr)["product"].(map[string]any)["images"].([]any)
	return imgs[len(imgs)-1].(map[string]any)["id"].(string)
}

func TestEostoreProductWorkflowAndPublicPDP(t *testing.T) {
	app := newTestApp(true)
	app.cfg.AdminEmail = "admin@eduardoos.com"

	co := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/companies", `{"name":"Acme","id":"acme"}`)
	companyGUID := decodeMap(t, co)["company"].(map[string]any)["guid"].(string)
	sec := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/sections", `{"company_guid":"`+companyGUID+`","name":"Textiles","id":"textiles"}`)
	sectionGUID := decodeMap(t, sec)["section"].(map[string]any)["guid"].(string)
	typ := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/types", `{"section_guid":"`+sectionGUID+`","name":"Towels","id":"towels"}`)
	typeGUID := decodeMap(t, typ)["type"].(map[string]any)["guid"].(string)

	// Invalid status rejected.
	bad := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/products", `{
		"type_guid":"`+typeGUID+`","name":"Nope","id":"nope","price_base_usd":1,"bs_per_usd":1,"units":1,"status":"live"
	}`)
	if bad.Code != http.StatusBadRequest {
		t.Fatalf("expected invalid status 400, got %d %s", bad.Code, bad.Body.String())
	}

	// Legacy visible=true derives active status.
	active := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/products", `{
		"type_guid":"`+typeGUID+`","name":"Beach Towel","id":"beach-towel","price_base_usd":20,"discount_percent":25,
		"bs_per_usd":40,"units":5,"visible":true,"sku":"TOW-1","seo_title":"Beach towel"
	}`)
	if active.Code != http.StatusOK {
		t.Fatalf("create active status=%d body=%s", active.Code, active.Body.String())
	}
	activeProduct := decodeMap(t, active)["product"].(map[string]any)
	if activeProduct["status"] != "active" || activeProduct["visible"] != true || activeProduct["sku"] != "TOW-1" {
		t.Fatalf("unexpected active product %#v", activeProduct)
	}
	activeGUID := activeProduct["guid"].(string)

	// Explicit draft wins over visible=true.
	draft := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/products", `{
		"type_guid":"`+typeGUID+`","name":"Hidden","id":"hidden","price_base_usd":9,"discount_percent":0,
		"bs_per_usd":40,"units":2,"visible":true,"status":"draft"
	}`)
	if draft.Code != http.StatusOK {
		t.Fatalf("create draft status=%d body=%s", draft.Code, draft.Body.String())
	}
	draftProduct := decodeMap(t, draft)["product"].(map[string]any)
	if draftProduct["status"] != "draft" || draftProduct["visible"] != false {
		t.Fatalf("expected draft invisible %#v", draftProduct)
	}
	draftGUID := draftProduct["guid"].(string)

	// Public catalog excludes drafts.
	catalog := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eostore/public/companies/acme", "")
	if catalog.Code != http.StatusOK {
		t.Fatalf("catalog status=%d body=%s", catalog.Code, catalog.Body.String())
	}
	listed := decodeMap(t, catalog)["products"].([]any)
	if len(listed) != 1 {
		t.Fatalf("expected 1 public product, got %d", len(listed))
	}

	// PDP returns the published product and no draft.
	pdp := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eostore/public/companies/acme/products/beach-towel", "")
	if pdp.Code != http.StatusOK {
		t.Fatalf("pdp status=%d body=%s", pdp.Code, pdp.Body.String())
	}
	if decodeMap(t, pdp)["product"].(map[string]any)["id"] != "beach-towel" {
		t.Fatalf("unexpected pdp %s", pdp.Body.String())
	}
	hidden := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eostore/public/companies/acme/products/hidden", "")
	if hidden.Code != http.StatusNotFound {
		t.Fatalf("expected draft pdp 404, got %d", hidden.Code)
	}

	// Publish the draft via PUT status=active.
	pub := app.doJSON(t, "admin@eduardoos.com", http.MethodPut, "/api/eostore/products/"+draftGUID, `{"status":"active"}`)
	if pub.Code != http.StatusOK {
		t.Fatalf("publish status=%d body=%s", pub.Code, pub.Body.String())
	}
	if decodeMap(t, pub)["product"].(map[string]any)["visible"] != true {
		t.Fatal("expected published product visible")
	}

	// Related products appear on the active PDP.
	pdp2 := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eostore/public/companies/acme/products/beach-towel", "")
	related := decodeMap(t, pdp2)["related"].([]any)
	if len(related) != 1 {
		t.Fatalf("expected 1 related product, got %d", len(related))
	}

	// Image alt + reorder.
	first := eostoreUploadImage(t, app, activeGUID)
	second := eostoreUploadImage(t, app, activeGUID)
	alt := app.doJSON(t, "admin@eduardoos.com", http.MethodPut, "/api/eostore/products/"+activeGUID+"/images/"+first, `{"alt":"Front view"}`)
	if alt.Code != http.StatusOK {
		t.Fatalf("alt update status=%d body=%s", alt.Code, alt.Body.String())
	}
	imgs := decodeMap(t, alt)["product"].(map[string]any)["images"].([]any)
	if imgs[0].(map[string]any)["alt"] != "Front view" {
		t.Fatalf("alt not saved %#v", imgs[0])
	}
	order := app.doJSON(t, "admin@eduardoos.com", http.MethodPut, "/api/eostore/products/"+activeGUID+"/images/order",
		`{"image_ids":["`+second+`","`+first+`"]}`)
	if order.Code != http.StatusOK {
		t.Fatalf("reorder status=%d body=%s", order.Code, order.Body.String())
	}
	reordered := decodeMap(t, order)["product"].(map[string]any)["images"].([]any)
	if reordered[0].(map[string]any)["id"] != second {
		t.Fatalf("expected reordered first image %s, got %#v", second, reordered[0])
	}
	// Reorder must reject a mismatched id set.
	badOrder := app.doJSON(t, "admin@eduardoos.com", http.MethodPut, "/api/eostore/products/"+activeGUID+"/images/order", `{"image_ids":["`+second+`"]}`)
	if badOrder.Code != http.StatusBadRequest {
		t.Fatalf("expected mismatched reorder 400, got %d", badOrder.Code)
	}
	memberAlt := app.doJSON(t, "member@eduardoos.com", http.MethodPut, "/api/eostore/products/"+activeGUID+"/images/"+first, `{"alt":"x"}`)
	if memberAlt.Code != http.StatusForbidden {
		t.Fatalf("member alt status=%d", memberAlt.Code)
	}
}

func TestEostoreEffectiveStatus(t *testing.T) {
	if eostoreEffectiveStatus(&EostoreProduct{Visible: true}) != EostoreStatusActive {
		t.Fatal("visible legacy product should be active")
	}
	if eostoreEffectiveStatus(&EostoreProduct{Visible: false}) != EostoreStatusDraft {
		t.Fatal("invisible legacy product should be draft")
	}
	if eostoreEffectiveStatus(&EostoreProduct{Visible: true, Status: EostoreStatusArchived}) != EostoreStatusArchived {
		t.Fatal("explicit status should win")
	}
	if normalizeEostoreStatus("ACTIVE ") != EostoreStatusActive || normalizeEostoreStatus("live") != "" {
		t.Fatal("unexpected status normalization")
	}
}

func TestEostoreCascadeDelete(t *testing.T) {
	app := newTestApp(true)
	app.cfg.AdminEmail = "admin@eduardoos.com"

	co := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/companies", `{"name":"Acme","id":"acme"}`)
	companyGUID := decodeMap(t, co)["company"].(map[string]any)["guid"].(string)
	sec := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/sections", `{"company_guid":"`+companyGUID+`","name":"Textiles","id":"textiles"}`)
	sectionGUID := decodeMap(t, sec)["section"].(map[string]any)["guid"].(string)
	typ := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/types", `{"section_guid":"`+sectionGUID+`","name":"Towels","id":"towels"}`)
	typeGUID := decodeMap(t, typ)["type"].(map[string]any)["guid"].(string)
	prod := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/products", `{
		"type_guid":"`+typeGUID+`","name":"Beach Towel","id":"beach-towel","price_base_usd":20,"discount_percent":0,
		"bs_per_usd":40,"units":5,"visible":true
	}`)
	productGUID := decodeMap(t, prod)["product"].(map[string]any)["guid"].(string)
	imageID := eostoreUploadImage(t, app, productGUID)
	imageURL := "/api/eostore/products/" + productGUID + "/images/" + imageID

	// Deleting a company with children succeeds and removes the whole tree.
	del := app.doJSON(t, "admin@eduardoos.com", http.MethodDelete, "/api/eostore/companies/"+companyGUID, "")
	if del.Code != http.StatusOK {
		t.Fatalf("cascade company delete status=%d body=%s", del.Code, del.Body.String())
	}
	payload := decodeMap(t, del)
	if int(payload["products"].(float64)) != 1 || int(payload["types"].(float64)) != 1 || int(payload["sections"].(float64)) != 1 {
		t.Fatalf("unexpected cascade counts %#v", payload)
	}
	for _, path := range []string{
		"/api/eostore/companies",
		"/api/eostore/sections?company_guid=" + companyGUID,
		"/api/eostore/types?company_guid=" + companyGUID,
		"/api/eostore/products?company_guid=" + companyGUID,
	} {
		list := app.doJSON(t, "admin@eduardoos.com", http.MethodGet, path, "")
		if list.Code != http.StatusOK || int(decodeMap(t, list)["count"].(float64)) != 0 {
			t.Fatalf("expected empty list for %s, got %d %s", path, list.Code, list.Body.String())
		}
	}
	img := app.doJSON(t, "admin@eduardoos.com", http.MethodGet, imageURL, "")
	if img.Code != http.StatusNotFound {
		t.Fatalf("expected image gone after cascade, got %d", img.Code)
	}
	// Second delete is a clean 404, not a conflict.
	again := app.doJSON(t, "admin@eduardoos.com", http.MethodDelete, "/api/eostore/companies/"+companyGUID, "")
	if again.Code != http.StatusNotFound {
		t.Fatalf("expected 404 on re-delete, got %d", again.Code)
	}

	// Section delete cascades its types and products too.
	co2 := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/companies", `{"name":"Beta","id":"beta"}`)
	company2 := decodeMap(t, co2)["company"].(map[string]any)["guid"].(string)
	sec2 := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/sections", `{"company_guid":"`+company2+`","name":"Kitchen","id":"kitchen"}`)
	section2 := decodeMap(t, sec2)["section"].(map[string]any)["guid"].(string)
	typ2 := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/types", `{"section_guid":"`+section2+`","name":"Cups","id":"cups"}`)
	type2 := decodeMap(t, typ2)["type"].(map[string]any)["guid"].(string)
	app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/products", `{
		"type_guid":"`+type2+`","name":"Mug","id":"mug","price_base_usd":5,"discount_percent":0,
		"bs_per_usd":40,"units":3,"visible":true
	}`)
	secDel := app.doJSON(t, "admin@eduardoos.com", http.MethodDelete, "/api/eostore/sections/"+section2, "")
	if secDel.Code != http.StatusOK {
		t.Fatalf("cascade section delete status=%d body=%s", secDel.Code, secDel.Body.String())
	}
	secList := app.doJSON(t, "admin@eduardoos.com", http.MethodGet, "/api/eostore/sections?company_guid="+company2, "")
	if int(decodeMap(t, secList)["count"].(float64)) != 0 {
		t.Fatal("expected section removed")
	}
}
