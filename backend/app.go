package main

import (
	"net/http"
	"os"
	"time"
)

type App struct {
	cfg             config
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
	_ = os.MkdirAll(cfg.MediaRoot, 0750)
	dummy, _ := hashPassword(randomID(16))
	app := &App{
		cfg:             cfg,
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
	mux.HandleFunc("POST /api/profile/avatar", a.uploadAvatarHandler)
	mux.HandleFunc("DELETE /api/profile/avatar", a.deleteAvatarHandler)
	mux.HandleFunc("GET /api/profile/avatar", a.getAvatarHandler)
	mux.HandleFunc("POST /api/admin/diagnostics/email-test", a.emailTestHandler)
	mux.HandleFunc("POST /api/admin/diagnostics/ai-chat-test", a.aiChatTestHandler)
	return mux
}
