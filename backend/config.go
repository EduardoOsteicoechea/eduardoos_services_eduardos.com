package main

import (
	"net/url"
	"os"
	"path/filepath"
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
	ListenAddr                string
	MongoURI                  string
	MongoDatabase             string
	JWTSecret                 string
	JWTIssuer                 string
	JWTAudience               string
	SecureCookies             bool
	AppEnv                    string
	EnableDiagnostics         bool
	EnableAuthDebug           bool
	MustLog                   bool
	AdminEmail                string
	AdminPassword             string
	BootstrapAdminEmail       string
	BootstrapAdminPassword    string
	MediaRoot                 string
	EreportMediaRoot          string
	EvoiceMediaRoot           string
	EoprojectMediaRoot        string
	EvoicePython              string
	EvoiceFakeTTS             bool
	EvoiceWorkerScript        string
	EvoiceMaxUploadBytes      int64
	EreportMaxImageBytes      int64
	EreportMaxImageEdge       int
	EreportMaxPayloadBytes    int64
	EoprojectMaxVideoBytes    int64
	EoprojectMaxDocumentBytes int64
	CalvinParagraphsRoot      string
	PublicBaseURL             string
	PublicArticlesOwnerEmail  string
	SMTPHost                  string
	SMTPPort                  string
	SMTPUsername              string
	SMTPPassword              string
	SMTPFromAddress           string
	SMTPFromName              string
	VoiceEnabled              bool
	VoiceSTTURL               string
	VoiceSTTLangDefault       string
	VoicePython               string
	VoiceTTScript             string
	VoicePiperModelES         string
	VoicePiperModelEN         string
	VoiceMaxChunkBytes        int64
	VoiceMaxSessionSeconds    int
	VoiceMaxConcurrent        int
	VoiceFakeSTT              bool
	VoiceFakeTTS              bool
	DeepSeekKey               string
	DeepSeekBaseURL           string
	DeepSeekModel             string
	DeepSeekVisionModel       string
	KimiKey                   string
	KimiBaseURL               string
	KimiModel                 string
	PayPalHostedButtonID      string
	PayPalCheckoutURL         string
	AllowedOrigins            []string
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
	deepseekVisionModel := strings.TrimSpace(os.Getenv("DEEPSEEK_VISION_MODEL"))
	if deepseekVisionModel == "" {
		deepseekVisionModel = "deepseek-flash"
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
	eoprojectRoot := strings.TrimSpace(os.Getenv("EOPROJECT_MEDIA_ROOT"))
	if eoprojectRoot == "" {
		eoprojectRoot = media + "/eoproject"
	}

	// On the VPS each deploy switches /opt/apps/<app>/current to a fresh release
	// directory. A relative media root (the .env.example defaults, for example)
	// resolves inside that release and is orphaned on the next deploy, so anchor
	// every relative/empty root to the persistent site media tree when it exists.
	// Local development has no /var/www/<site>, so .data/media is kept there.
	siteRoot := "/var/www/" + siteName
	siteRootExists := false
	if info, err := os.Stat(siteRoot); err == nil && info.IsDir() {
		siteRootExists = true
		persistentMedia := filepath.Join(siteRoot, "media")
		if media == "" || !filepath.IsAbs(media) {
			media = persistentMedia
		}
		if ereportRoot == "" || !filepath.IsAbs(ereportRoot) {
			ereportRoot = filepath.Join(media, "ereport")
		}
		if evoiceRoot == "" || !filepath.IsAbs(evoiceRoot) {
			evoiceRoot = filepath.Join(media, "evoice")
		}
		if eoprojectRoot == "" || !filepath.IsAbs(eoprojectRoot) {
			eoprojectRoot = filepath.Join(media, "eoproject")
		}
	}

	production := appEnv == "production" || envBool("COOKIE_SECURE", false) || siteRootExists
	publicBase := strings.TrimRight(strings.TrimSpace(os.Getenv("PUBLIC_BASE_URL")), "/")
	if production && (publicBase == "" || isLoopbackBaseURL(publicBase)) {
		publicBase = "https://" + siteName
	}

	// Never ship the silent placeholder runner in production: a misconfigured
	// EVOICE_FAKE_TTS=true would otherwise generate empty audio that looks real.
	evoiceFake := envBool("EVOICE_FAKE_TTS", false)
	if production {
		evoiceFake = false
	}

	// eVoice accepts large documents; set EVOICE_MAX_UPLOAD_BYTES=0 for no cap.
	evoiceMaxUpload := envInt64("EVOICE_MAX_UPLOAD_BYTES", evoiceDefaultMaxUpload)
	if evoiceMaxUpload < 0 {
		evoiceMaxUpload = 0
	}

	calvinRoot := resolveCalvinParagraphsRoot(os.Getenv("CALVIN_INSTITUTES_PARAGRAPHS_ROOT"))
	publicArticlesOwner := strings.ToLower(strings.TrimSpace(envString("PUBLIC_ARTICLES_OWNER_EMAIL")))
	if publicArticlesOwner == "" {
		publicArticlesOwner = "eduardooost@gmail.com"
	}

	return config{
		ListenAddr:                listenHost + ":" + port,
		MongoURI:                  mongoURIFromEnv(),
		MongoDatabase:             mongoDatabase,
		JWTSecret:                 envString("JWT_SECRET"),
		JWTIssuer:                 issuer,
		JWTAudience:               audience,
		SecureCookies:             envBool("COOKIE_SECURE", false),
		AppEnv:                    appEnv,
		EnableDiagnostics:         envBool("ENABLE_ADMIN_DIAGNOSTICS", false),
		EnableAuthDebug:           envBool("ENABLE_AUTH_DEBUG", false),
		MustLog:                   envBool("MUST_LOG", appEnv == "development"),
		AdminEmail:                strings.TrimSpace(os.Getenv("ADMIN_EMAIL")),
		AdminPassword:             os.Getenv("ADMIN_PASSWORD"),
		BootstrapAdminEmail:       strings.TrimSpace(os.Getenv("BOOTSTRAP_ADMIN_EMAIL")),
		BootstrapAdminPassword:    os.Getenv("BOOTSTRAP_ADMIN_PASSWORD"),
		MediaRoot:                 media,
		EreportMediaRoot:          ereportRoot,
		EvoiceMediaRoot:           evoiceRoot,
		EoprojectMediaRoot:        eoprojectRoot,
		EvoicePython:              strings.TrimSpace(os.Getenv("EVOICE_PYTHON")),
		EvoiceFakeTTS:             evoiceFake,
		EvoiceWorkerScript:        strings.TrimSpace(os.Getenv("EVOICE_WORKER_SCRIPT")),
		EvoiceMaxUploadBytes:      evoiceMaxUpload,
		EreportMaxImageBytes:      envInt64("EREPORT_MAX_IMAGE_BYTES", defaultMaxImageBytes),
		EreportMaxImageEdge:       int(envInt64("EREPORT_MAX_IMAGE_EDGE", int64(defaultMaxImageEdge))),
		EreportMaxPayloadBytes:    envInt64("EREPORT_MAX_PAYLOAD_BYTES", defaultMaxPayloadBytes),
		EoprojectMaxVideoBytes:    envInt64("EOPROJECT_MAX_VIDEO_BYTES", defaultEoprojectMaxVideoBytes),
		EoprojectMaxDocumentBytes: envInt64("EOPROJECT_MAX_DOCUMENT_BYTES", defaultEoprojectMaxDocBytes),
		CalvinParagraphsRoot:      calvinRoot,
		PublicBaseURL:             publicBase,
		PublicArticlesOwnerEmail:  publicArticlesOwner,
		SMTPHost:                  envString("SMTP_HOST"),
		SMTPPort:                  envString("SMTP_PORT"),
		SMTPUsername:              envString("SMTP_USERNAME"),
		SMTPPassword:              envString("SMTP_PASSWORD"),
		SMTPFromAddress:           from,
		SMTPFromName:              smtpName,
		VoiceEnabled:              envBool("VOICE_ENABLED", false),
		VoiceSTTURL:               voiceEnvDefault("VOICE_STT_URL", "http://127.0.0.1:8090"),
		VoiceSTTLangDefault:       voiceEnvDefault("VOICE_STT_LANG_DEFAULT", "es"),
		VoicePython:               envString("VOICE_PYTHON"),
		VoiceTTScript:             envString("VOICE_TTS_SCRIPT"),
		VoicePiperModelES:         envString("VOICE_PIPER_MODEL_ES"),
		VoicePiperModelEN:         envString("VOICE_PIPER_MODEL_EN"),
		VoiceMaxChunkBytes:        envInt64("VOICE_MAX_CHUNK_BYTES", voiceDefaultChunkBytes),
		VoiceMaxSessionSeconds:    int(envInt64("VOICE_MAX_SESSION_SECONDS", voiceDefaultSessionSec)),
		VoiceMaxConcurrent:        int(envInt64("VOICE_MAX_CONCURRENT", voiceDefaultConcurrent)),
		VoiceFakeSTT:              envBool("VOICE_FAKE_STT", false),
		VoiceFakeTTS:              envBool("VOICE_FAKE_TTS", false),
		DeepSeekKey:               os.Getenv("DEEPSEEK_API_KEY"),
		DeepSeekBaseURL:           strings.TrimRight(deepseekBase, "/"),
		DeepSeekModel:             deepseekModel,
		DeepSeekVisionModel:       deepseekVisionModel,
		KimiKey:                   os.Getenv("KIMI_API_KEY"),
		KimiBaseURL:               strings.TrimRight(kimiBase, "/"),
		KimiModel:                 kimiModel,
		PayPalHostedButtonID:      strings.TrimSpace(os.Getenv("PAYPAL_HOSTED_BUTTON_ID")),
		PayPalCheckoutURL:         paypalCheckout,
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

// isLoopbackBaseURL reports whether a configured public base URL points at the
// local machine. A loopback value (the .env.example default) must never leak
// into production share links, so production replaces it with https://<domain>.
func isLoopbackBaseURL(raw string) bool {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return false
	}
	host := strings.ToLower(u.Hostname())
	switch host {
	case "localhost", "127.0.0.1", "0.0.0.0", "::1":
		return true
	}
	return strings.HasSuffix(host, ".localhost")
}

func voiceEnvDefault(key, fallback string) string {
	if v := envString(key); v != "" {
		return v
	}
	return fallback
}
