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
