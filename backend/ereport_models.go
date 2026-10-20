package main

import (
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	inviteScopeOrg    = "org"
	inviteScopeReport = "report"
	maxHistorySnapshots = 50
	otpEreportInvite  = "ereport_invite"
	productEreport          = "ereport"
	productEreportConnector = "ereport-connector"
	productScrib            = "scrib"
	productEpam             = "epam"
	productPamphlet         = productEpam // legacy alias constant; storage/catalog id is "epam"
	productArticles         = "articles"
	productHomescool        = "homescool"
	productAPI              = "api"
	apiKeyPrefix      = "eos_live_"
	apiKeyRatePerMin  = 60
	defaultMaxImageBytes   = 8 << 20
	defaultMaxImageEdge    = 8192
	defaultMaxPayloadBytes = 8 << 20
	maxImagesPerReport     = 80
	inviteCookieTTL        = 30 * 24 * time.Hour
)

const (
	ereportPurposeOther   = "other"
	ereportPurposeWebsite = "website_registration"
)

type ereportCard struct {
	ID           string `json:"id"`
	Tema         string `json:"tema"`
	ReportNumber string `json:"reportNumber,omitempty"`
	Purpose      string `json:"purpose,omitempty"`
	UpdatedAt    string `json:"updatedAt"`
}

type ereportLibrary struct {
	Reports []ereportCard `json:"reports"`
}

type ereportMeta struct {
	ID                 string   `json:"id"`
	Tema               string   `json:"tema"`
	ReportNumber       string   `json:"reportNumber,omitempty"`
	ReportDate         string   `json:"reportDate,omitempty"`
	Purpose            string   `json:"purpose,omitempty"` // website_registration | other
	ConnectorSectionID string   `json:"connectorSectionId,omitempty"`
	ConnectorGroupID   string   `json:"connectorGroupId,omitempty"`
	ConnectorHosts     []string `json:"connectorHosts,omitempty"`
	OrgID              string   `json:"orgId"`
	OwnerUserID        string   `json:"ownerUserId"`
	OwnerEmail         string   `json:"ownerEmail,omitempty"`
	OwnerSafe          string   `json:"ownerSafe,omitempty"`
	OwnerUsername      string   `json:"ownerUsername,omitempty"`
	CreatedAt          string   `json:"createdAt"`
	UpdatedAt          string   `json:"updatedAt"`
}

// websiteRegistrationBinding is returned by GET /api/ereport/access.
type websiteRegistrationBinding struct {
	OrgID          string   `json:"orgId"`
	ReportID       string   `json:"reportId"`
	Tema           string   `json:"tema"`
	SectionID      string   `json:"sectionId,omitempty"`
	GroupID        string   `json:"groupId,omitempty"`
	ConnectorHosts []string `json:"connectorHosts,omitempty"`
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
	OrgID          string `json:"orgId"`
	OrgName        string `json:"orgName,omitempty"`
	ID             string `json:"id"`
	Tema           string `json:"tema"`
	ReportNumber   string `json:"reportNumber,omitempty"`
	UpdatedAt      string `json:"updatedAt"`
	OpenCount      int    `json:"openCount"`
	CompletedCount int    `json:"completedCount"`
}

type ereportInvite struct {
	ID            string   `json:"id"`
	SecretHash    string   `json:"secretHash"`
	SessionHash   string   `json:"sessionHash,omitempty"`   // legacy single slot; mirrored to latest SessionHashes entry
	SessionHashes []string `json:"sessionHashes,omitempty"` // concurrent invite browsers (shared links)
	OTPRequests   int      `json:"otpRequests,omitempty"`
	Scope         string   `json:"scope"`
	OwnerUserID   string   `json:"ownerUserId"`
	OrgID         string   `json:"orgId"`
	ReportID      string   `json:"reportId,omitempty"`
	InvitedEmail  string   `json:"invitedEmail"`
	Message       string   `json:"message,omitempty"`
	NotifyEmails  []string `json:"notifyEmails,omitempty"`
	ExpiresAt     string   `json:"expiresAt"`
	CreatedAt     string   `json:"createdAt"`
	CanEdit       bool     `json:"canEdit"`
	ConsumedOTPAt string   `json:"consumedOtpAt,omitempty"`
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

// defaultWebsiteConnectorIDs returns the first section/group ids from the empty
// payload template (used when creating a website_registration report).
func defaultWebsiteConnectorIDs() (sectionID, groupID string) {
	payload := emptyEreportPayload()
	sections, _ := payload["sections"].([]any)
	if len(sections) == 0 {
		return "", ""
	}
	sec, _ := sections[0].(map[string]any)
	sectionID, _ = sec["id"].(string)
	groups, _ := sec["groups"].([]any)
	if len(groups) == 0 {
		return strings.TrimSpace(sectionID), ""
	}
	grp, _ := groups[0].(map[string]any)
	groupID, _ = grp["id"].(string)
	return strings.TrimSpace(sectionID), strings.TrimSpace(groupID)
}

// applyWebsiteConnectorDefaults sets connectorSectionId/connectorGroupId on meta
// when purpose is website_registration and they are not already set.
func applyWebsiteConnectorDefaults(meta *ereportMeta) {
	if meta == nil || normalizeEreportPurpose(meta.Purpose) != ereportPurposeWebsite {
		return
	}
	if strings.TrimSpace(meta.ConnectorSectionID) != "" && strings.TrimSpace(meta.ConnectorGroupID) != "" {
		return
	}
	sectionID, groupID := defaultWebsiteConnectorIDs()
	if strings.TrimSpace(meta.ConnectorSectionID) == "" {
		meta.ConnectorSectionID = sectionID
	}
	if strings.TrimSpace(meta.ConnectorGroupID) == "" {
		meta.ConnectorGroupID = groupID
	}
}

func emptyEreportItem(id string) map[string]any {
	return map[string]any{
		"id":              id,
		"nombre":          "",
		"incidencia":      "",
		"fechaIncidencia": "",
		"status":          "reprobado",
		"criteriaStatus":  map[string]any{},
		"checklist": []any{
			map[string]any{
				"id":      "ux-test",
				"label":   "UX Test",
				"checked": false,
			},
		},
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

func normalizeEreportPurpose(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case ereportPurposeWebsite, "website":
		return ereportPurposeWebsite
	default:
		return ereportPurposeOther
	}
}

func websiteRegistrationFromMeta(meta ereportMeta) websiteRegistrationBinding {
	hosts := meta.ConnectorHosts
	if hosts == nil {
		hosts = []string{}
	} else {
		hosts = append([]string(nil), hosts...)
	}
	return websiteRegistrationBinding{
		OrgID:          meta.OrgID,
		ReportID:       meta.ID,
		Tema:           meta.Tema,
		SectionID:      strings.TrimSpace(meta.ConnectorSectionID),
		GroupID:        strings.TrimSpace(meta.ConnectorGroupID),
		ConnectorHosts: hosts,
	}
}

// normalizeConnectorHost lowercases, strips port, and optionally strips a leading www.
func normalizeConnectorHost(raw string) string {
	h := strings.ToLower(strings.TrimSpace(raw))
	if h == "" {
		return ""
	}
	if i := strings.Index(h, "://"); i >= 0 {
		h = h[i+3:]
	}
	if i := strings.IndexAny(h, "/?#"); i >= 0 {
		h = h[:i]
	}
	if host, _, err := net.SplitHostPort(h); err == nil {
		h = host
	} else if strings.HasPrefix(h, "[") {
		// IPv6 without port — leave as-is after bracket trim if present
		h = strings.Trim(h, "[]")
	}
	h = strings.TrimPrefix(h, "www.")
	return h
}

func normalizeConnectorHosts(hosts []string) []string {
	if hosts == nil {
		return nil
	}
	out := make([]string, 0, len(hosts))
	seen := make(map[string]struct{}, len(hosts))
	for _, raw := range hosts {
		n := normalizeConnectorHost(raw)
		if n == "" {
			continue
		}
		if _, ok := seen[n]; ok {
			continue
		}
		seen[n] = struct{}{}
		out = append(out, n)
	}
	return out
}

func requestConnectorHost(r *http.Request) string {
	if r == nil {
		return ""
	}
	raw := strings.TrimSpace(r.Header.Get("Origin"))
	if raw == "" {
		raw = strings.TrimSpace(r.Header.Get("Referer"))
	}
	if raw == "" {
		return ""
	}
	parsed, err := url.Parse(raw)
	if err == nil && parsed.Host != "" {
		return normalizeConnectorHost(parsed.Host)
	}
	return normalizeConnectorHost(raw)
}

// listWebsiteRegistrations returns every report with purpose website_registration.
func (a *App) listWebsiteRegistrations(ownerUserID string) []websiteRegistrationBinding {
	out := make([]websiteRegistrationBinding, 0)
	idx, err := a.ereport.loadOrgsIndex(ownerUserID)
	if err != nil {
		return out
	}
	for _, org := range idx.Orgs {
		lib, libErr := a.ereport.loadOrgLibrary(ownerUserID, org.ID)
		if libErr != nil {
			continue
		}
		for _, card := range lib.Reports {
			meta, _, loadErr := a.ereport.loadReport(ownerUserID, org.ID, card.ID)
			if loadErr != nil {
				continue
			}
			if normalizeEreportPurpose(meta.Purpose) != ereportPurposeWebsite {
				continue
			}
			binding := websiteRegistrationFromMeta(meta)
			binding.OrgID = org.ID
			out = append(out, binding)
		}
	}
	return out
}

// resolveActiveWebsiteRegistration picks the binding whose connectorHosts match
// the request Origin/Referer host; otherwise the first list item; otherwise empty.
func resolveActiveWebsiteRegistration(r *http.Request, list []websiteRegistrationBinding) websiteRegistrationBinding {
	if len(list) == 0 {
		return websiteRegistrationBinding{}
	}
	host := requestConnectorHost(r)
	if host != "" {
		for _, b := range list {
			for _, ch := range b.ConnectorHosts {
				if normalizeConnectorHost(ch) == host {
					return b
				}
			}
		}
	}
	return list[0]
}

func ereportTodayDate() string {
	return time.Now().UTC().Format("2006-01-02")
}
