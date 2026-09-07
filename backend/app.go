package main

import (
	"net/http"
	"time"
)

type App struct {
	cfg             config
	users           *userStore
	sessions        *sessionStore
	mailer          Mailer
	chat            map[string]ChatClient
	audit           *auditStore
	loginLimit      *limiter
	emailAdminLimit *limiter
	emailSiteLimit  *limiter
	aiAdminLimit    *limiter
	aiSiteLimit     *limiter
}

func newApp(cfg config) *App {
	if cfg.JWTSecret == "" {
		cfg.JWTSecret = randomID(32)
	}
	app := &App{
		cfg:             cfg,
		users:           newUserStore(),
		sessions:        newSessionStore(),
		mailer:          smtpMailer{cfg: cfg},
		chat:            map[string]ChatClient{},
		audit:           newAuditStore(),
		loginLimit:      newLimiter(15*time.Minute, 10),
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
	app.seedAdmin()
	return app
}

func (a *App) seedAdmin() {
	if a.cfg.AdminEmail == "" || a.cfg.AdminPassword == "" {
		return
	}
	hash, err := hashPassword(a.cfg.AdminPassword)
	if err != nil {
		return
	}
	a.users.put(&User{
		ID:            randomID(8),
		Email:         a.cfg.AdminEmail,
		PasswordHash:  hash,
		Role:          "admin",
		EmailVerified: true,
	})
}

func (a *App) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", healthHandler)
	mux.HandleFunc("GET /api/health", healthHandler)
	mux.HandleFunc("GET /api/info", infoHandler)
	mux.HandleFunc("GET /api/auth/me", a.meHandler)
	mux.HandleFunc("POST /api/auth/login", a.loginHandler)
	mux.HandleFunc("POST /api/auth/logout", a.logoutHandler)
	mux.HandleFunc("POST /api/admin/diagnostics/email-test", a.emailTestHandler)
	mux.HandleFunc("POST /api/admin/diagnostics/ai-chat-test", a.aiChatTestHandler)
	return mux
}
