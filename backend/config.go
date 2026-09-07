package main

import (
	"os"
	"strings"
)

const (
	siteName      = "eduardoos.com"
	displayName   = "Eduardoos"
	defaultPort   = "8081"
	listenHost    = "127.0.0.1"
	jwtIssuer     = "https://eduardoos.com"
	jwtAudience   = "https://eduardoos.com"
	mongoDatabase = "eduardoos"
)

type config struct {
	ListenAddr             string
	MongoURI               string
	MongoDatabase          string
	JWTSecret              string
	JWTIssuer              string
	JWTAudience            string
	SecureCookies          bool
	AppEnv                 string
	EnableDiagnostics      bool
	AdminEmail             string
	AdminPassword          string
	BootstrapAdminEmail    string
	BootstrapAdminPassword string
	MediaRoot              string
	SMTPHost               string
	SMTPPort               string
	SMTPUsername           string
	SMTPPassword           string
	SMTPFromAddress        string
	SMTPFromName           string
	DeepSeekKey            string
	DeepSeekBaseURL        string
	DeepSeekModel          string
	KimiKey                string
	KimiBaseURL            string
	KimiModel              string
	AllowedOrigins         []string
}

func loadConfig() config {
	loadDotEnvFiles()

	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	issuer := strings.TrimSpace(os.Getenv("JWT_ISSUER"))
	if issuer == "" {
		issuer = jwtIssuer
	}
	audience := strings.TrimSpace(os.Getenv("JWT_AUDIENCE"))
	if audience == "" {
		audience = jwtAudience
	}

	deepseekBase := strings.TrimSpace(os.Getenv("DEEPSEEK_API_BASE"))
	if deepseekBase == "" {
		deepseekBase = "https://api.deepseek.com"
	}
	deepseekModel := strings.TrimSpace(os.Getenv("DEEPSEEK_MODEL"))
	if deepseekModel == "" {
		deepseekModel = "deepseek-v4-flash"
	}
	kimiBase := strings.TrimSpace(os.Getenv("KIMI_API_BASE"))
	if kimiBase == "" {
		kimiBase = "https://api.moonshot.ai/v1"
	}
	kimiModel := strings.TrimSpace(os.Getenv("KIMI_MODEL"))
	if kimiModel == "" {
		kimiModel = "kimi-k2.6"
	}

	from := strings.TrimSpace(os.Getenv("SMTP_FROM_ADDRESS"))
	if from == "" {
		from = "noreply@" + siteName
	}

	appEnv := strings.ToLower(strings.TrimSpace(os.Getenv("APP_ENV")))
	if appEnv == "" {
		if envBool("COOKIE_SECURE", false) {
			appEnv = "production"
		} else {
			appEnv = "development"
		}
	}

	media := strings.TrimSpace(os.Getenv("MEDIA_ROOT"))
	if media == "" {
		if envBool("COOKIE_SECURE", false) {
			media = "/var/www/" + siteName + "/media"
		} else {
			media = filepathJoinLocalMedia()
		}
	}

	return config{
		ListenAddr:             listenHost + ":" + port,
		MongoURI:               os.Getenv("MONGO_URI"),
		MongoDatabase:          mongoDatabase,
		JWTSecret:              os.Getenv("JWT_SECRET"),
		JWTIssuer:              issuer,
		JWTAudience:            audience,
		SecureCookies:          envBool("COOKIE_SECURE", false),
		AppEnv:                 appEnv,
		EnableDiagnostics:      envBool("ENABLE_ADMIN_DIAGNOSTICS", false),
		AdminEmail:             strings.TrimSpace(os.Getenv("ADMIN_EMAIL")),
		AdminPassword:          os.Getenv("ADMIN_PASSWORD"),
		BootstrapAdminEmail:    strings.TrimSpace(os.Getenv("BOOTSTRAP_ADMIN_EMAIL")),
		BootstrapAdminPassword: os.Getenv("BOOTSTRAP_ADMIN_PASSWORD"),
		MediaRoot:              media,
		SMTPHost:               os.Getenv("SMTP_HOST"),
		SMTPPort:               os.Getenv("SMTP_PORT"),
		SMTPUsername:           os.Getenv("SMTP_USERNAME"),
		SMTPPassword:           os.Getenv("SMTP_PASSWORD"),
		SMTPFromAddress:        from,
		SMTPFromName:           os.Getenv("SMTP_FROM_NAME"),
		DeepSeekKey:            os.Getenv("DEEPSEEK_API_KEY"),
		DeepSeekBaseURL:        strings.TrimRight(deepseekBase, "/"),
		DeepSeekModel:          deepseekModel,
		KimiKey:                os.Getenv("KIMI_API_KEY"),
		KimiBaseURL:            strings.TrimRight(kimiBase, "/"),
		KimiModel:              kimiModel,
		AllowedOrigins: []string{
			"https://" + siteName,
			"http://127.0.0.1:4321",
			"http://localhost:4321",
			"http://127.0.0.1:" + port,
		},
	}
}

func filepathJoinLocalMedia() string {
	return ".data/media"
}
