package main

import (
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"
)

type App struct {
	cfg             config
	log             *slog.Logger
	store           DataStore
	scrib           ScribStore
	pamphlet        PamphletStore
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
	evoiceMeta      evoiceMetaStore
	evoiceFS        *evoiceFS
	evoiceJobs      *evoiceJobStore
	homescool       HomescoolStore
	eoadmin         EoadminStore
	eostore         EostoreStore
	eostoreCart     EostoreCartStore
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
	if cfg.EvoiceMediaRoot == "" {
		cfg.EvoiceMediaRoot = cfg.MediaRoot + "/evoice"
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
	if strings.TrimSpace(cfg.CalvinParagraphsRoot) == "" {
		cfg.CalvinParagraphsRoot = ".data/calvin-institutes-paragraphs"
	}
	if strings.TrimSpace(cfg.EvoiceMediaRoot) == "" {
		cfg.EvoiceMediaRoot = cfg.MediaRoot + "/evoice"
	}
	_ = os.MkdirAll(cfg.MediaRoot, 0750)
	_ = os.MkdirAll(cfg.EreportMediaRoot, 0750)
	_ = os.MkdirAll(cfg.EvoiceMediaRoot, 0750)
	_ = os.MkdirAll(cfg.EvoiceMediaRoot, 0750)
	dummy, _ := hashPassword(randomID(16))
	app := &App{
		cfg:             cfg,
		log:             newJSONLogger(),
		store:           store,
		scrib:           openScribStore(store),
		pamphlet:        openPamphletStore(store, cfg.MediaRoot),
		homescool:       openHomescoolStore(store, cfg.MediaRoot),
		eoadmin:         openEoadminStore(store),
		eostore:         openEostoreStore(store),
		eostoreCart:     openEostoreCartStore(store),
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
		evoiceMeta:      newEvoiceMetaFromStore(store),
		evoiceFS:        newEvoiceFS(cfg.EvoiceMediaRoot),
	}
	app.evoiceJobs = newEvoiceJobStore(resolveEvoiceRunner(cfg), app.evoiceMeta, app.evoiceFS, app.log, cfg.MustLog)
	app.ereport.owner = app.ereportOwnerLookup
	httpClient := newHTTPClient()
	app.chat["deepseek"] = openAICompatClient{
		name:        "deepseek",
		baseURL:     cfg.DeepSeekBaseURL,
		apiKey:      cfg.DeepSeekKey,
		model:       cfg.DeepSeekModel,
		visionModel: cfg.DeepSeekVisionModel,
		http:        httpClient,
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
	mux.HandleFunc("GET /api/admin/users", a.listUsersHandler)
	mux.HandleFunc("POST /api/admin/diagnostics/email-test", a.emailTestHandler)
	mux.HandleFunc("POST /api/admin/diagnostics/ai-chat-test", a.aiChatTestHandler)
	mux.HandleFunc("POST /api/chat", a.publicChatHandler)
	mux.HandleFunc("POST /api/profile/ask", a.profileAskHandler)

	mux.HandleFunc("GET /api/subscriptions/catalog", a.subscriptionsCatalogHandler)
	mux.HandleFunc("GET /api/subscriptions/entitlements", a.subscriptionsEntitlementsHandler)
	mux.HandleFunc("GET /api/subscriptions/entitlements/preview", a.subscriptionsEntitlementsPreviewHandler)
	mux.HandleFunc("GET /api/subscriptions/access/{serviceID}", a.subscriptionsAccessHandler)
	mux.HandleFunc("POST /api/payments/intents", a.paymentsCreateIntentHandler)
	mux.HandleFunc("GET /api/payments/status/{intentID}", a.paymentsStatusHandler)
	mux.HandleFunc("GET /api/preferences/{key}", a.preferencesGetHandler)
	mux.HandleFunc("PUT /api/preferences/{key}", a.preferencesPutHandler)

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

	mux.HandleFunc("GET /api/latin/calvins-institutes", a.latinCalvinsInstitutesHandler)
	mux.HandleFunc("GET /api/latin/calvins-institutes/paragraphs", a.latinCalvinsParagraphsHandler)
	mux.HandleFunc("GET /api/latin/calvins-institutes/paragraphs/chapters/{book}/{chapter}", a.latinCalvinsParagraphChapterHandler)

	mux.HandleFunc("GET /api/scrib/library", a.scribGetLibraryHandler)
	mux.HandleFunc("POST /api/scrib/books", a.scribCreateBookHandler)
	mux.HandleFunc("GET /api/scrib/books/{bookId}", a.scribGetBookHandler)
	mux.HandleFunc("PUT /api/scrib/books/{bookId}", a.scribRenameBookHandler)
	mux.HandleFunc("DELETE /api/scrib/books/{bookId}", a.scribDeleteBookHandler)
	mux.HandleFunc("POST /api/scrib/books/{bookId}/sheets", a.scribCreateSheetHandler)
	mux.HandleFunc("GET /api/scrib/books/{bookId}/sheets/{sheetId}", a.scribGetSheetHandler)
	mux.HandleFunc("PUT /api/scrib/books/{bookId}/sheets/{sheetId}", a.scribPutSheetHandler)
	mux.HandleFunc("DELETE /api/scrib/books/{bookId}/sheets/{sheetId}", a.scribDeleteSheetHandler)
	mux.HandleFunc("POST /api/scrib/print/pdf", a.scribPrintPDFHandler)

	mux.HandleFunc("GET /api/epams/series-tree", a.listEpamSeriesTreeHandler)
	mux.HandleFunc("GET /api/epams/footers", a.listFootersHandler)
	mux.HandleFunc("POST /api/epams/footers", a.createFooterHandler)
	mux.HandleFunc("PUT /api/epams/footers/{id}", a.updateFooterHandler)
	mux.HandleFunc("DELETE /api/epams/footers/{id}", a.deleteFooterHandler)
	mux.HandleFunc("GET /api/epams", a.listEpamsHandler)
	mux.HandleFunc("POST /api/epams", a.createEpamHandler)
	mux.HandleFunc("POST /api/epams/{id}/copy", a.copyEpamHandler)
	mux.HandleFunc("GET /api/epams/{id}", a.getEpamHandler)
	mux.HandleFunc("PUT /api/epams/{id}", a.updateEpamHandler)
	mux.HandleFunc("DELETE /api/epams/{id}", a.deleteEpamHandler)
	mux.HandleFunc("POST /api/documents/pamphlet/pdf", a.pamphletPDFHandler)

	mux.HandleFunc("POST /api/homescool/students", a.registerHomescoolStudentHandler)
	mux.HandleFunc("GET /api/homescool/students", a.listHomescoolStudentsHandler)
	mux.HandleFunc("GET /api/homescool/students/{studentSlug}", a.getHomescoolStudentHandler)
	mux.HandleFunc("GET /api/homescool/students/{studentSlug}/folders/{folder}", a.listTeacherStudentFolderHandler)
	mux.HandleFunc("POST /api/homescool/task-templates", a.createTaskTemplateHandler)
	mux.HandleFunc("GET /api/homescool/task-templates", a.listTaskTemplatesHandler)
	mux.HandleFunc("GET /api/homescool/task-templates/{templateId}", a.getTaskTemplateHandler)
	mux.HandleFunc("PUT /api/homescool/task-templates/{templateId}", a.updateTaskTemplateHandler)
	mux.HandleFunc("POST /api/homescool/catalogs", a.createCatalogEntryHandler)
	mux.HandleFunc("GET /api/homescool/catalogs", a.listCatalogEntriesHandler)
	mux.HandleFunc("POST /api/homescool/students/{studentSlug}/tasks", a.assignTasksHandler)
	mux.HandleFunc("GET /api/homescool/students/{studentSlug}/tasks", a.listTeacherStudentTasksHandler)
	mux.HandleFunc("POST /api/homescool/students/{studentSlug}/tasks/{taskId}/grade", a.gradeTaskHandler)
	mux.HandleFunc("POST /api/homescool/students/{studentSlug}/tasks/{taskId}/archive", a.archiveTaskHandler)
	mux.HandleFunc("GET /api/homescool/learning", a.listHomescoolLearningHandler)
	mux.HandleFunc("GET /api/homescool/learning/{teacherSlug}/folders/{folder}", a.listLearningFolderHandler)
	mux.HandleFunc("GET /api/homescool/learning/{teacherSlug}/tasks", a.listLearningTasksHandler)
	mux.HandleFunc("GET /api/homescool/learning/{teacherSlug}/tasks/{taskId}", a.getLearningTaskHandler)
	mux.HandleFunc("POST /api/homescool/learning/{teacherSlug}/tasks/{taskId}/submit", a.submitLearningTaskHandler)

	a.registerEvoiceRoutes(mux)
	a.registerEoadminRoutes(mux)
	a.registerEostoreRoutes(mux)
	a.registerEostoreShopRoutes(mux)

	return a.withObservability(mux)
}
