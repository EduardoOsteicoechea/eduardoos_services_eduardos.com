package main

import (
	"strings"
	"time"
)

const (
	inviteScopeOrg    = "org"
	inviteScopeReport = "report"
	maxHistorySnapshots = 50
	otpEreportInvite  = "ereport_invite"
	productEreport    = "ereport"
	productAPI        = "api"
	apiKeyPrefix      = "eos_live_"
	apiKeyRatePerMin  = 60
	defaultMaxImageBytes   = 8 << 20
	defaultMaxImageEdge    = 8192
	defaultMaxPayloadBytes = 8 << 20
	maxImagesPerReport     = 80
	inviteCookieTTL        = 30 * 24 * time.Hour
)

type ereportCard struct {
	ID           string `json:"id"`
	Tema         string `json:"tema"`
	ReportNumber string `json:"reportNumber,omitempty"`
	UpdatedAt    string `json:"updatedAt"`
}

type ereportLibrary struct {
	Reports []ereportCard `json:"reports"`
}

type ereportMeta struct {
	ID           string `json:"id"`
	Tema         string `json:"tema"`
	ReportNumber string `json:"reportNumber,omitempty"`
	ReportDate   string `json:"reportDate,omitempty"`
	OrgID        string `json:"orgId"`
	OwnerUserID  string `json:"ownerUserId"`
	OwnerEmail   string `json:"ownerEmail,omitempty"`
	OwnerSafe    string `json:"ownerSafe,omitempty"`
	OwnerUsername string `json:"ownerUsername,omitempty"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
}

type ereportOrgCard struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Order     int    `json:"order"`
	Hidden    bool   `json:"hidden"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type ereportOrgsIndex struct {
	Orgs []ereportOrgCard `json:"orgs"`
}

type ereportOrgMeta struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	OwnerUserID   string `json:"ownerUserId"`
	OwnerEmail    string `json:"ownerEmail,omitempty"`
	OwnerSafe     string `json:"ownerSafe,omitempty"`
	OwnerUsername string `json:"ownerUsername,omitempty"`
	Order         int    `json:"order"`
	Hidden        bool   `json:"hidden"`
	CreatedAt     string `json:"createdAt"`
	UpdatedAt     string `json:"updatedAt"`
}

type ereportRecentCard struct {
	OrgID        string `json:"orgId"`
	OrgName      string `json:"orgName,omitempty"`
	ID           string `json:"id"`
	Tema         string `json:"tema"`
	ReportNumber string `json:"reportNumber,omitempty"`
	UpdatedAt    string `json:"updatedAt"`
}

type ereportInvite struct {
	ID            string `json:"id"`
	SecretHash    string `json:"secretHash"`
	SessionHash   string `json:"sessionHash,omitempty"`
	OTPRequests   int    `json:"otpRequests,omitempty"`
	Scope         string `json:"scope"`
	OwnerUserID   string `json:"ownerUserId"`
	OrgID         string `json:"orgId"`
	ReportID      string `json:"reportId,omitempty"`
	InvitedEmail  string `json:"invitedEmail"`
	ExpiresAt     string `json:"expiresAt"`
	CreatedAt     string `json:"createdAt"`
	CanEdit       bool   `json:"canEdit"`
	ConsumedOTPAt string `json:"consumedOtpAt,omitempty"`
}

type ereportInvitePublic struct {
	ID        string `json:"id"`
	Scope     string `json:"scope"`
	OrgID     string `json:"orgId"`
	ReportID  string `json:"reportId,omitempty"`
	ExpiresAt string `json:"expiresAt"`
	CreatedAt string `json:"createdAt"`
	CanEdit   bool   `json:"canEdit"`
}

type ereportSnapshot struct {
	ID        string         `json:"id"`
	CreatedAt string         `json:"createdAt"`
	Source    string         `json:"source"`
	KeyPrefix string         `json:"keyPrefix,omitempty"`
	Tema      string         `json:"tema"`
	Payload   map[string]any `json:"payload"`
}

type ereportHistoryIndex struct {
	Items []ereportHistoryCard `json:"items"`
}

type ereportHistoryCard struct {
	ID        string `json:"id"`
	CreatedAt string `json:"createdAt"`
	Source    string `json:"source"`
	KeyPrefix string `json:"keyPrefix,omitempty"`
	Tema      string `json:"tema"`
}

type ereportImageRef struct {
	ID   string `json:"id"`
	MIME string `json:"mime"`
	Name string `json:"name"`
	URL  string `json:"url"`
}

type Entitlement struct {
	ID        string     `bson:"_id"`
	UserID    string     `bson:"user_id"`
	Product   string     `bson:"product"`
	Active    bool       `bson:"active"`
	ExpiresAt *time.Time `bson:"expires_at,omitempty"`
	CreatedAt time.Time  `bson:"created_at"`
}

func (e *Entitlement) clone() *Entitlement {
	if e == nil {
		return nil
	}
	cp := *e
	if e.ExpiresAt != nil {
		t := *e.ExpiresAt
		cp.ExpiresAt = &t
	}
	return &cp
}

func (e *Entitlement) isLive(now time.Time) bool {
	if e == nil || !e.Active {
		return false
	}
	if e.ExpiresAt != nil && !now.Before(*e.ExpiresAt) {
		return false
	}
	return true
}

type APIKeyRecord struct {
	ID         string     `bson:"_id"`
	UserID     string     `bson:"user_id"`
	Label      string     `bson:"label"`
	Prefix     string     `bson:"prefix"`
	SecretHash string     `bson:"secret_hash"`
	CreatedAt  time.Time  `bson:"created_at"`
	LastUsedAt *time.Time `bson:"last_used_at,omitempty"`
	RevokedAt  *time.Time `bson:"revoked_at,omitempty"`
}

func (k *APIKeyRecord) clone() *APIKeyRecord {
	if k == nil {
		return nil
	}
	cp := *k
	if k.LastUsedAt != nil {
		t := *k.LastUsedAt
		cp.LastUsedAt = &t
	}
	if k.RevokedAt != nil {
		t := *k.RevokedAt
		cp.RevokedAt = &t
	}
	return &cp
}

func emptyEreportPayload() map[string]any {
	return map[string]any{
		"reportDate":         "",
		"reportNumber":       "",
		"reportName":         "",
		"orgName":            "",
		"appTitle":           "Issue Tracker",
		"validationCriteria": []any{},
		"sections": []any{
			map[string]any{
				"id":    "section-a",
				"title": "1. Product / platform",
				"kind":  "funcionalidades",
				"groups": []any{
					map[string]any{
						"id":    "group-1",
						"title": "General",
						"items": []any{
							emptyEreportItem("group-1-item-1"),
						},
					},
				},
			},
		},
	}
}

func emptyEreportItem(id string) map[string]any {
	return map[string]any{
		"id":               id,
		"nombre":           "",
		"incidencia":       "",
		"fechaIncidencia":  "",
		"status":           "",
		"criteriaStatus":   map[string]any{},
		"solucion":         "",
		"fechaSolucion":    "",
		"imagesIncidencia": []any{},
		"imagesSolucion":   []any{},
		"images":           []any{},
	}
}

func displayOwnerSafe(email string) string {
	return strings.ReplaceAll(strings.ToLower(strings.TrimSpace(email)), "@", "_at_")
}
