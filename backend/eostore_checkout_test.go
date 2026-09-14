package main

import (
	"net/http"
	"testing"
)

func TestEostoreCheckoutCreatesPendingStatement(t *testing.T) {
	app := newTestApp(true)

	co := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/companies", `{"name":"Acme Store","id":"acme"}`)
	if co.Code != http.StatusOK {
		t.Fatalf("create company: %d %s", co.Code, co.Body.String())
	}
	company := decodeMap(t, co)["company"].(map[string]any)
	companyGUID, _ := company["guid"].(string)

	secRes := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/sections", `{"company_guid":"`+companyGUID+`","name":"Rings","id":"rings"}`)
	sectionGUID, _ := decodeMap(t, secRes)["section"].(map[string]any)["guid"].(string)
	typRes := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/types", `{"section_guid":"`+sectionGUID+`","name":"Gold","id":"gold"}`)
	typeGUID, _ := decodeMap(t, typRes)["type"].(map[string]any)["guid"].(string)

	prodRes := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eostore/products", `{
		"type_guid":"`+typeGUID+`",
		"name":"Blue Ring",
		"id":"blue-ring",
		"price_base_usd":5,
		"bs_per_usd":40,
		"units":6,
		"status":"active"
	}`)
	if prodRes.Code != http.StatusOK {
		t.Fatalf("create product: %d %s", prodRes.Code, prodRes.Body.String())
	}
	product := decodeMap(t, prodRes)["product"].(map[string]any)
	productGUID, _ := product["guid"].(string)

	add := app.doJSON(t, "member@eduardoos.com", http.MethodPut, "/api/eostore/cart/acme", `{"product_guid":"`+productGUID+`","units":2}`)
	if add.Code != http.StatusOK {
		t.Fatalf("add to cart: %d %s", add.Code, add.Body.String())
	}
	cart := decodeMap(t, add)["cart"].(map[string]any)
	if cart["count"].(float64) != 1 || cart["total_usd"].(float64) != 10 {
		t.Fatalf("unexpected cart: %#v", cart)
	}

	checkout := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/eostore/cart/acme/checkout", `{"description":"please deliver soon"}`)
	if checkout.Code != http.StatusOK {
		t.Fatalf("checkout: %d %s", checkout.Code, checkout.Body.String())
	}
	out := decodeMap(t, checkout)
	if out["statement_id"] == nil || out["statement_id"].(string) == "" {
		t.Fatalf("missing statement id: %#v", out)
	}

	list := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eoadmin/statements", "")
	if list.Code != http.StatusOK {
		t.Fatalf("list statements: %d %s", list.Code, list.Body.String())
	}
	rows, _ := decodeMap(t, list)["statements"].([]any)
	if len(rows) != 1 {
		t.Fatalf("expected one statement, got %#v", rows)
	}
	statement := rows[0].(map[string]any)
	if statement["status"] != eoadminStatusPendingPayment {
		t.Fatalf("expected %s, got %#v", eoadminStatusPendingPayment, statement["status"])
	}

	empty := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eostore/cart/acme", "")
	if decodeMap(t, empty)["cart"].(map[string]any)["count"].(float64) != 0 {
		t.Fatalf("cart should be empty after checkout")
	}

	after := app.doJSON(t, "admin@eduardoos.com", http.MethodGet, "/api/eostore/products/"+productGUID, "")
	if decodeMap(t, after)["product"].(map[string]any)["units"].(float64) != 4 {
		t.Fatalf("inventory should be reserved: %#v", decodeMap(t, after)["product"])
	}
}
