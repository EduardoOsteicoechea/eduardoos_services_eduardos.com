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
	EnableAuthDebug        bool
	MustLog                bool
	AdminEmail             string
	AdminPassword          string
	BootstrapAdminEmail    string
	BootstrapAdminPassword string
	MediaRoot              string
	EreportMediaRoot       string
	EvoiceMediaRoot        string
	EvoicePython           string
	EvoiceFakeTTS          bool
	EvoiceWorkerScript     string
	EreportMaxImageBytes   int64
	EreportMaxImageEdge    int
	EreportMaxPayloadBytes int64
	CalvinParagraphsRoot   string
	PublicBaseURL          string
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
	PayPalHostedButtonID   string
	PayPalCheckoutURL      string
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
		kimiModel = "kimi-k3"
	}
	paypalCheckout := strings.TrimSpace(os.Getenv("PAYPAL_CHECKOUT_URL"))
	if paypalCheckout == "" {
		paypalCheckout = "https://www.paypal.com/cgi-bin/webscr"
	}

	from := smtpFromAddressFromEnv()
	if from == "" {
		from = envString("SMTP_USERNAME")
	}
	if from == "" {
		from = "noreply@" + siteName
	}
	smtpName := envString("SMTP_FROM_NAME")
	if smtpName == "" {
		smtpName = displayName
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

	ereportRoot := strings.TrimSpace(os.Getenv("EREPORT_MEDIA_ROOT"))
	if ereportRoot == "" {
		ereportRoot = media + "/ereport"
	}
	evoiceRoot := strings.TrimSpace(os.Getenv("EVOICE_MEDIA_ROOT"))
	if evoiceRoot == "" {
		evoiceRoot = media + "/evoice"
	}

	calvinRoot := strings.TrimSpace(os.Getenv("CALVIN_INSTITUTES_PARAGRAPHS_ROOT"))
	if calvinRoot == "" {
		calvinRoot = ".data/calvin-institutes-paragraphs"
	}

	return config{
		ListenAddr:             listenHost + ":" + port,
		MongoURI:               mongoURIFromEnv(),
		MongoDatabase:          mongoDatabase,
		JWTSecret:              envString("JWT_SECRET"),
		JWTIssuer:              issuer,
		JWTAudience:            audience,
		SecureCookies:          envBool("COOKIE_SECURE", false),
		AppEnv:                 appEnv,
		EnableDiagnostics:      envBool("ENABLE_ADMIN_DIAGNOSTICS", false),
		EnableAuthDebug:        envBool("ENABLE_AUTH_DEBUG", false),
		MustLog:                envBool("MUST_LOG", appEnv == "development"),
		AdminEmail:             strings.TrimSpace(os.Getenv("ADMIN_EMAIL")),
		AdminPassword:          os.Getenv("ADMIN_PASSWORD"),
		BootstrapAdminEmail:    strings.TrimSpace(os.Getenv("BOOTSTRAP_ADMIN_EMAIL")),
		BootstrapAdminPassword: os.Getenv("BOOTSTRAP_ADMIN_PASSWORD"),
		MediaRoot:              media,
		EreportMediaRoot:       ereportRoot,
		EvoiceMediaRoot:        evoiceRoot,
		EvoicePython:           strings.TrimSpace(os.Getenv("EVOICE_PYTHON")),
		EvoiceFakeTTS:          envBool("EVOICE_FAKE_TTS", false),
		EvoiceWorkerScript:     strings.TrimSpace(os.Getenv("EVOICE_WORKER_SCRIPT")),
		EreportMaxImageBytes:   envInt64("EREPORT_MAX_IMAGE_BYTES", defaultMaxImageBytes),
		EreportMaxImageEdge:    int(envInt64("EREPORT_MAX_IMAGE_EDGE", int64(defaultMaxImageEdge))),
		EreportMaxPayloadBytes: envInt64("EREPORT_MAX_PAYLOAD_BYTES", defaultMaxPayloadBytes),
		CalvinParagraphsRoot:   calvinRoot,
		PublicBaseURL:          strings.TrimRight(strings.TrimSpace(os.Getenv("PUBLIC_BASE_URL")), "/"),
		SMTPHost:               envString("SMTP_HOST"),
		SMTPPort:               envString("SMTP_PORT"),
		SMTPUsername:           envString("SMTP_USERNAME"),
		SMTPPassword:           envString("SMTP_PASSWORD"),
		SMTPFromAddress:        from,
		SMTPFromName:           smtpName,
		DeepSeekKey:            os.Getenv("DEEPSEEK_API_KEY"),
		DeepSeekBaseURL:        strings.TrimRight(deepseekBase, "/"),
		DeepSeekModel:          deepseekModel,
		KimiKey:                os.Getenv("KIMI_API_KEY"),
		KimiBaseURL:            strings.TrimRight(kimiBase, "/"),
		KimiModel:              kimiModel,
		PayPalHostedButtonID:   strings.TrimSpace(os.Getenv("PAYPAL_HOSTED_BUTTON_ID")),
		PayPalCheckoutURL:      paypalCheckout,
		AllowedOrigins: []string{
			"https://" + siteName,
			"http://127.0.0.1:4321",
			"http://localhost:4321",
			"https://127.0.0.1:4321",
			"https://localhost:4321",
			"http://127.0.0.1:" + port,
		},
	}
}

func filepathJoinLocalMedia() string {
	return ".data/media"
}
