package main

import (
	"log/slog"
	"net/http"
	"os"
	"time"
)

type App struct {
	cfg             config
	log             *slog.Logger
	store           DataStore
	mailer          Mailer
	chat            map[string]ChatClient
	audit           *auditStore
	dummyHash       string
	loginIPLimit    *limiter
	loginIDLimit    *limiter
	registerLimit   *limiter
	resendIPLimit   *limiter
	resendIDLimit   *limiter
	resetIPLimit    *limiter
	resetIDLimit    *limiter
	refreshLimit    *limiter
	profileLimit    *limiter
	emailAdminLimit *limiter
	emailSiteLimit  *limiter
	aiAdminLimit    *limiter
	aiSiteLimit     *limiter
	chatIPLimit     *limiter
	chatUserLimit   *limiter
	inviteOTPLimit  *limiter
	inviteVerifyLim *limiter
	apiKeyLimit     *limiter
	ereport         *ereportFS
	failClosedEnt   bool
}

func newApp(cfg config) *App {
	return newAppWithStore(cfg, newMemoryStore())
}

func newAppWithStore(cfg config, store DataStore) *App {
	if cfg.JWTSecret == "" {
		cfg.JWTSecret = randomID(32)
	}
	if cfg.MediaRoot == "" {
		cfg.MediaRoot = ".data/media"
	}
	if cfg.EreportMediaRoot == "" {
		cfg.EreportMediaRoot = cfg.MediaRoot + "/ereport"
	}
	if cfg.EreportMaxImageBytes <= 0 {
		cfg.EreportMaxImageBytes = defaultMaxImageBytes
	}
	if cfg.EreportMaxImageEdge <= 0 {
		cfg.EreportMaxImageEdge = defaultMaxImageEdge
	}
	if cfg.EreportMaxPayloadBytes <= 0 {
		cfg.EreportMaxPayloadBytes = defaultMaxPayloadBytes
	}
	_ = os.MkdirAll(cfg.MediaRoot, 0750)
	_ = os.MkdirAll(cfg.EreportMediaRoot, 0750)
	dummy, _ := hashPassword(randomID(16))
	app := &App{
		cfg:             cfg,
		log:             newJSONLogger(),
		store:           store,
		mailer:          smtpMailer{cfg: cfg},
		chat:            map[string]ChatClient{},
		audit:           newAuditStore(),
		dummyHash:       dummy,
		loginIPLimit:    newLimiter(15*time.Minute, 5),
		loginIDLimit:    newLimiter(15*time.Minute, 5),
		registerLimit:   newLimiter(time.Hour, 3),
		resendIPLimit:   newLimiter(time.Hour, 3),
		resendIDLimit:   newLimiter(time.Hour, 3),
		resetIPLimit:    newLimiter(time.Hour, 3),
		resetIDLimit:    newLimiter(time.Hour, 3),
		refreshLimit:    newLimiter(time.Minute, 30),
		profileLimit:    newLimiter(time.Hour, 20),
		emailAdminLimit: newLimiter(emailAdminWindow, 1),
		emailSiteLimit:  newLimiter(emailSiteWindow, emailSiteMax),
		aiAdminLimit:    newLimiter(aiAdminWindow, aiAdminMax),
		aiSiteLimit:     newLimiter(aiSiteWindow, aiSiteMax),
		chatIPLimit:     newLimiter(publicChatWindow, publicChatIPMax),
		chatUserLimit:   newLimiter(publicChatWindow, publicChatUserMax),
		inviteOTPLimit:  newLimiter(time.Hour, 8),
		inviteVerifyLim: newLimiter(15*time.Minute, 10),
		apiKeyLimit:     newLimiter(time.Minute, apiKeyRatePerMin),
		ereport:         newEreportFS(cfg.EreportMediaRoot),
	}
	httpClient := newHTTPClient()
	app.chat["deepseek"] = openAICompatClient{
		name:    "deepseek",
		baseURL: cfg.DeepSeekBaseURL,
		apiKey:  cfg.DeepSeekKey,
		model:   cfg.DeepSeekModel,
		http:    httpClient,
	}
	app.chat["kimi"] = openAICompatClient{
		name:    "kimi",
		baseURL: cfg.KimiBaseURL,
		apiKey:  cfg.KimiKey,
		model:   cfg.KimiModel,
		http:    httpClient,
	}
	app.bootstrapAdmin()
	return app
}

func (a *App) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", healthHandler)
	mux.HandleFunc("GET /api/health", healthHandler)
	mux.HandleFunc("GET /api/info", infoHandler)
	mux.HandleFunc("GET /api/auth/csrf", a.csrfHandler)
	mux.HandleFunc("GET /api/auth/me", a.meHandler)
	mux.HandleFunc("POST /api/auth/register", a.registerHandler)
	mux.HandleFunc("POST /api/auth/verify-email", a.verifyEmailHandler)
	mux.HandleFunc("POST /api/auth/resend-verification", a.resendVerificationHandler)
	mux.HandleFunc("POST /api/auth/login", a.loginHandler)
	mux.HandleFunc("POST /api/auth/refresh", a.refreshHandler)
	mux.HandleFunc("POST /api/auth/logout", a.logoutHandler)
	mux.HandleFunc("POST /api/auth/change-password", a.changePasswordHandler)
	mux.HandleFunc("POST /api/auth/request-password-reset", a.requestPasswordResetHandler)
	mux.HandleFunc("POST /api/auth/reset-password", a.resetPasswordHandler)
	mux.HandleFunc("PATCH /api/profile", a.patchProfileHandler)
	mux.HandleFunc("POST /api/profile", a.patchProfileHandler)
	mux.HandleFunc("PATCH /profile", a.patchProfileHandler)
	mux.HandleFunc("POST /profile", a.patchProfileHandler)
	mux.HandleFunc("POST /api/profile/avatar", a.uploadAvatarHandler)
	mux.HandleFunc("DELETE /api/profile/avatar", a.deleteAvatarHandler)
	mux.HandleFunc("GET /api/profile/avatar", a.getAvatarHandler)
	mux.HandleFunc("POST /profile/avatar", a.uploadAvatarHandler)
	mux.HandleFunc("DELETE /profile/avatar", a.deleteAvatarHandler)
	mux.HandleFunc("GET /profile/avatar", a.getAvatarHandler)
	mux.HandleFunc("POST /api/admin/diagnostics/email-test", a.emailTestHandler)
	mux.HandleFunc("POST /api/admin/diagnostics/ai-chat-test", a.aiChatTestHandler)
	mux.HandleFunc("POST /api/chat", a.publicChatHandler)

	mux.HandleFunc("GET /api/ereport/access", a.ereportAccessHandler)
	mux.HandleFunc("GET /api/ereport/orgs", a.ereportGetOrgsHandler)
	mux.HandleFunc("POST /api/ereport/orgs", a.ereportCreateOrgHandler)
	mux.HandleFunc("PUT /api/ereport/orgs", a.ereportPutOrgsHandler)
	mux.HandleFunc("GET /api/ereport/orgs/{orgId}", a.ereportGetOrgHandler)
	mux.HandleFunc("DELETE /api/ereport/orgs/{orgId}", a.ereportDeleteOrgHandler)
	mux.HandleFunc("POST /api/ereport/orgs/{orgId}/reports", a.ereportCreateReportHandler)
	mux.HandleFunc("POST /api/ereport/orgs/{orgId}/import", a.ereportImportReportHandler)
	mux.HandleFunc("POST /api/ereport/orgs/{orgId}/invites", a.ereportCreateOrgInviteHandler)
	mux.HandleFunc("GET /api/ereport/orgs/{orgId}/reports/{reportId}", a.ereportGetReportHandler)
	mux.HandleFunc("PUT /api/ereport/orgs/{orgId}/reports/{reportId}", a.ereportPutReportHandler)
	mux.HandleFunc("DELETE /api/ereport/orgs/{orgId}/reports/{reportId}", a.ereportDeleteReportHandler)
	mux.HandleFunc("POST /api/ereport/orgs/{orgId}/reports/{reportId}/invites", a.ereportCreateReportInviteHandler)
	mux.HandleFunc("POST /api/ereport/orgs/{orgId}/reports/{reportId}/images", a.ereportUploadImageHandler)
	mux.HandleFunc("GET /api/ereport/orgs/{orgId}/reports/{reportId}/images/{imageId}", a.ereportGetImageHandler)
	mux.HandleFunc("GET /api/ereport/orgs/{orgId}/reports/{reportId}/history", a.ereportListHistoryHandler)
	mux.HandleFunc("GET /api/ereport/orgs/{orgId}/reports/{reportId}/history/{snapshotId}", a.ereportGetHistoryHandler)
	mux.HandleFunc("POST /api/ereport/orgs/{orgId}/reports/{reportId}/history/{snapshotId}/restore", a.ereportRestoreHistoryHandler)

	mux.HandleFunc("GET /api/ereport/invites/{inviteId}", a.ereportGetInviteHandler)
	mux.HandleFunc("POST /api/ereport/invites/{inviteId}/otp", a.ereportInviteOTPHandler)
	mux.HandleFunc("POST /api/ereport/invites/{inviteId}/verify", a.ereportInviteVerifyHandler)
	mux.HandleFunc("GET /api/ereport/invite-session", a.ereportInviteSessionHandler)
	mux.HandleFunc("GET /api/ereport/invite-session/reports/{reportId}", a.ereportInviteGetReportHandler)
	mux.HandleFunc("PUT /api/ereport/invite-session/reports/{reportId}", a.ereportInvitePutReportHandler)
	mux.HandleFunc("POST /api/ereport/invite-session/reports/{reportId}/images", a.ereportInviteUploadImageHandler)
	mux.HandleFunc("GET /api/ereport/invite-session/reports/{reportId}/images/{imageId}", a.ereportInviteGetImageHandler)

	mux.HandleFunc("GET /api/apikeys", a.listAPIKeysHandler)
	mux.HandleFunc("POST /api/apikeys", a.createAPIKeyHandler)
	mux.HandleFunc("DELETE /api/apikeys/{id}", a.deleteAPIKeyHandler)

	mux.HandleFunc("GET /api/v1/docs", a.v1DocsHandler)
	mux.HandleFunc("GET /api/v1/ereport/access", a.withAPIKey(productEreport, a.ereportV1AccessHandler))
	mux.HandleFunc("GET /api/v1/ereport/orgs", a.withAPIKey(productEreport, a.ereportV1OrgsHandler))
	mux.HandleFunc("GET /api/v1/ereport/library", a.withAPIKey(productEreport, a.ereportV1LibraryHandler))
	mux.HandleFunc("GET /api/v1/ereport/orgs/{orgId}/reports", a.withAPIKey(productEreport, a.ereportV1OrgReportsHandler))
	mux.HandleFunc("GET /api/v1/ereport/orgs/{orgId}/reports/{reportId}", a.withAPIKey(productEreport, a.ereportV1GetReportHandler))
	mux.HandleFunc("POST /api/v1/ereport/orgs/{orgId}/reports/{reportId}", a.withAPIKey(productEreport, a.ereportV1PostReportHandler))
	return a.withObservability(mux)
}
