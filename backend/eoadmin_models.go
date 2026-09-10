package main

import (
	"strings"
	"time"
)

const (
	eoadminStatusPendingPayment  = "pending_payment"
	eoadminStatusPendingApproval = "pending_approval"
	eoadminStatusToDeliver       = "to_deliver"
	eoadminStatusDelivered       = "delivered"
	eoadminStatusRejected        = "rejected"

	eoadminMediaPrefix = "eoadmin"
	maxEoadminImageBytes = 8 << 20
	maxEoadminImageEdge  = 4096
)

// EoadminRect is a normalized rectangle on the payment-proof image (0–1).
type EoadminRect struct {
	X float64 `json:"x" bson:"x"`
	Y float64 `json:"y" bson:"y"`
	W float64 `json:"w" bson:"w"`
	H float64 `json:"h" bson:"h"`
}

func (r *EoadminRect) valid() bool {
	if r == nil {
		return false
	}
	if r.X < 0 || r.Y < 0 || r.W <= 0 || r.H <= 0 {
		return false
	}
	if r.X+r.W > 1.0001 || r.Y+r.H > 1.0001 {
		return false
	}
	return true
}

// EoadminRects groups the three annotation boxes.
type EoadminRects struct {
	Amount    EoadminRect  `json:"amount" bson:"amount"`
	Reference EoadminRect  `json:"reference" bson:"reference"`
	Date      *EoadminRect `json:"date,omitempty" bson:"date,omitempty"`
}

// EoadminCheckboxDef is one selectable line item on an assignment option.
type EoadminCheckboxDef struct {
	ID        string `json:"id" bson:"id"`
	Label     string `json:"label" bson:"label"`
	UnitLabel string `json:"unit_label" bson:"unit_label"`
}

// EoadminOption is an assignable payment target stored in Mongo.
type EoadminOption struct {
	ID          string                `json:"id" bson:"_id"`
	Label       string                `json:"label" bson:"label"`
	Description string                `json:"description" bson:"description"`
	ProductID   string                `json:"product_id,omitempty" bson:"product_id,omitempty"`
	Checkboxes  []EoadminCheckboxDef  `json:"checkboxes" bson:"checkboxes"`
	Active      bool                  `json:"active" bson:"active"`
	SortOrder   int                   `json:"sort_order" bson:"sort_order"`
	CreatedAt   time.Time             `json:"created_at" bson:"created_at"`
	UpdatedAt   time.Time             `json:"updated_at" bson:"updated_at"`
}

func (o *EoadminOption) clone() *EoadminOption {
	if o == nil {
		return nil
	}
	cp := *o
	if o.Checkboxes != nil {
		cp.Checkboxes = append([]EoadminCheckboxDef(nil), o.Checkboxes...)
	}
	return &cp
}

// EoadminSelectedItem is a checked line with units on a statement.
type EoadminSelectedItem struct {
	CheckboxID         string  `json:"checkbox_id" bson:"checkbox_id"`
	Label              string  `json:"label" bson:"label"`
	UnitLabel          string  `json:"unit_label" bson:"unit_label"`
	Units              int     `json:"units" bson:"units"`
	EostoreProductGUID string  `json:"eostore_product_guid,omitempty" bson:"eostore_product_guid,omitempty"`
	UnitPriceUSD       float64 `json:"unit_price_usd,omitempty" bson:"unit_price_usd,omitempty"`
}

// EoadminStatement is a purchase statement awaiting / past admin approval.
type EoadminStatement struct {
	ID                 string                `json:"id" bson:"_id"`
	UserID             string                `json:"user_id" bson:"user_id"`
	UserEmail          string                `json:"user_email" bson:"user_email"`
	OptionID           string                `json:"option_id" bson:"option_id"`
	OptionLabel        string                `json:"option_label" bson:"option_label"`
	ProductID          string                `json:"product_id,omitempty" bson:"product_id,omitempty"`
	EostoreCompanyGUID string                `json:"eostore_company_guid,omitempty" bson:"eostore_company_guid,omitempty"`
	InventoryReserved  bool                  `json:"inventory_reserved,omitempty" bson:"inventory_reserved,omitempty"`
	Items              []EoadminSelectedItem `json:"items" bson:"items"`
	Description        string                `json:"description" bson:"description"`
	Rects              EoadminRects          `json:"rects" bson:"rects"`
	SVG                string                `json:"svg" bson:"svg"`
	ImageKey           string                `json:"image_key,omitempty" bson:"image_key,omitempty"`
	ImageContentType   string                `json:"image_content_type,omitempty" bson:"image_content_type,omitempty"`
	ImageBytes         int64                 `json:"image_bytes,omitempty" bson:"image_bytes,omitempty"`
	Status             string                `json:"status" bson:"status"`
	AdminNote          string                `json:"admin_note,omitempty" bson:"admin_note,omitempty"`
	ApprovedAt         *time.Time            `json:"approved_at,omitempty" bson:"approved_at,omitempty"`
	ApprovedBy         string                `json:"approved_by,omitempty" bson:"approved_by,omitempty"`
	DeliveredAt        *time.Time            `json:"delivered_at,omitempty" bson:"delivered_at,omitempty"`
	DeliveredBy        string                `json:"delivered_by,omitempty" bson:"delivered_by,omitempty"`
	CreatedAt          time.Time             `json:"created_at" bson:"created_at"`
	UpdatedAt          time.Time             `json:"updated_at" bson:"updated_at"`
}

func (s *EoadminStatement) clone() *EoadminStatement {
	if s == nil {
		return nil
	}
	cp := *s
	if s.Items != nil {
		cp.Items = append([]EoadminSelectedItem(nil), s.Items...)
	}
	if s.Rects.Date != nil {
		d := *s.Rects.Date
		cp.Rects.Date = &d
	}
	if s.ApprovedAt != nil {
		t := *s.ApprovedAt
		cp.ApprovedAt = &t
	}
	if s.DeliveredAt != nil {
		t := *s.DeliveredAt
		cp.DeliveredAt = &t
	}
	return &cp
}

func eoadminStatusKnown(status string) bool {
	switch strings.TrimSpace(status) {
	case eoadminStatusPendingPayment, eoadminStatusPendingApproval, eoadminStatusToDeliver, eoadminStatusDelivered, eoadminStatusRejected:
		return true
	default:
		return false
	}
}

func defaultEoadminOptions(now time.Time) []*EoadminOption {
	mk := func(id, label, desc, product string, order int, boxes []EoadminCheckboxDef) *EoadminOption {
		return &EoadminOption{
			ID:          id,
			Label:       label,
			Description: desc,
			ProductID:   product,
			Checkboxes:  boxes,
			Active:      true,
			SortOrder:   order,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
	}
	monthBox := []EoadminCheckboxDef{
		{ID: "months", Label: "Months of access", UnitLabel: "months"},
		{ID: "seats", Label: "Seats / seats", UnitLabel: "seats"},
	}
	return []*EoadminOption{
		mk("opt-pamphlet", "Pamphlet", "Cloud pamphlet editor and print export.", "pamphlet", 10, monthBox),
		mk("opt-homescool", "Homescool", "Homescool learning surface.", "homescool", 20, monthBox),
		mk("opt-scrib", "Scrib", "Layered US Letter manuscript sheets.", "scrib", 30, monthBox),
		mk("opt-ereport", "eReport", "Issue tracker reports with cloud storage.", "ereport", 40, monthBox),
		mk("opt-evoice", "eVoice", "Text-to-audio projects.", "evoice", 50, monthBox),
		mk("opt-api", "API", "Product API access.", "api", 60, monthBox),
	}
}

func defaultEoadminOptionsTurquesa(now time.Time) []*EoadminOption {
	mk := func(id, label, desc string, order int, boxes []EoadminCheckboxDef) *EoadminOption {
		return &EoadminOption{
			ID: id, Label: label, Description: desc, Checkboxes: boxes,
			Active: true, SortOrder: order, CreatedAt: now, UpdatedAt: now,
		}
	}
	qty := []EoadminCheckboxDef{
		{ID: "units", Label: "Units", UnitLabel: "units"},
		{ID: "sets", Label: "Sets", UnitLabel: "sets"},
	}
	return []*EoadminOption{
		mk("opt-textiles", "Home textiles", "Coastal home textiles.", 10, qty),
		mk("opt-table", "Table settings", "Coastal table settings.", 20, qty),
		mk("opt-everyday", "Everyday objects", "Durable everyday objects.", 30, qty),
		mk("opt-seasonal", "Seasonal pieces", "Seasonal longevity pieces.", 40, qty),
	}
}
