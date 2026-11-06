package main

import "time"

const (
	productEeyes          = "eeyes"
	eeyesDeviceTokenPrefix = "eos_dev_"
	eeyesPairingTTL        = 10 * time.Minute
	eeyesDeviceTTL         = 30 * 24 * time.Hour
	eeyesPairMaxAttempts   = 5
	eeyesMaxImageBytes     = 2 << 20
	eeyesMaxAudioBytes     = 5 << 20
	eeyesMaxPhotosDefault  = 10
	eeyesMaxPhotosCap      = 50
	eeyesMaxAudioSecCap    = 300

	colEeyesPairings = "eeyes_pairings"
	colEeyesDevices  = "eeyes_devices"
	colEeyesTasks    = "eeyes_tasks"
	colEeyesMedia    = "eeyes_media"

	eeyesTaskPending     = "pending"
	eeyesTaskInProgress  = "in_progress"
	eeyesTaskCompleted   = "completed"
	eeyesTaskCancelled   = "cancelled"
	eeyesPairingOpen     = "open"
	eeyesPairingPaired   = "paired"
	eeyesPairingExpired  = "expired"
	eeyesMediaKindImage  = "image"
	eeyesMediaKindAudio  = "audio"
	eeyesMaxAnalysisRunes = 2000
)

const eeyesNotificationHorizon = 24 * time.Hour

// eeyesTaskKindNotice marks a notification-only task: no capture, hidden from the
// shell task list, completed when the device acks its notification.
const eeyesTaskKindNotice = "notice"

// eeyesTaskKindPhoto is a scheduled single photo: at NotifyAt the device takes
// one picture with CameraFacing and the first upload completes the task.
const eeyesTaskKindPhoto = "photo"

const (
	eeyesCameraBack  = "back"
	eeyesCameraFront = "front"
)

type eeyesPairing struct {
	ID           string     `json:"id" bson:"_id"`
	OwnerID      string     `json:"ownerId" bson:"owner_id"`
	Code1Hash    string     `json:"-" bson:"code1_hash"`
	Code2Hash    string     `json:"-" bson:"code2_hash"`
	Code3Hash    string     `json:"-" bson:"code3_hash"`
	Status       string     `json:"status" bson:"status"`
	Attempts     int        `json:"-" bson:"attempts"`
	Step         int        `json:"step" bson:"step"`
	SessionHash  string     `json:"-" bson:"session_hash,omitempty"`
	DeviceID     string     `json:"deviceId,omitempty" bson:"device_id,omitempty"`
	DeviceLabel  string     `json:"deviceLabel,omitempty" bson:"device_label,omitempty"`
	CreatedAt    time.Time  `json:"createdAt" bson:"created_at"`
	ExpiresAt    time.Time  `json:"expiresAt" bson:"expires_at"`
	ConsumedAt   *time.Time `json:"consumedAt,omitempty" bson:"consumed_at,omitempty"`
}

type eeyesDevice struct {
	ID            string     `json:"id" bson:"_id"`
	OwnerID       string     `json:"ownerId" bson:"owner_id"`
	Label         string     `json:"label" bson:"label"`
	Platform      string     `json:"platform" bson:"platform"`
	Model         string     `json:"model" bson:"model"`
	ShellVersion  string     `json:"shellVersion" bson:"shell_version"`
	TokenHash     string     `json:"-" bson:"token_hash"`
	TokenPrefix   string     `json:"tokenPrefix" bson:"token_prefix"`
	CreatedAt     time.Time  `json:"createdAt" bson:"created_at"`
	ExpiresAt     time.Time  `json:"expiresAt" bson:"expires_at"`
	LastSeenAt    time.Time  `json:"lastSeenAt" bson:"last_seen_at"`
	RevokedAt     *time.Time `json:"revokedAt,omitempty" bson:"revoked_at,omitempty"`
	PairingID     string     `json:"pairingId,omitempty" bson:"pairing_id,omitempty"`
	InstallHash   string     `json:"-" bson:"install_hash,omitempty"`
	LastSyncAt    *time.Time `json:"lastSyncAt,omitempty" bson:"last_sync_at,omitempty"`
	LastSyncNotes int        `json:"lastSyncNotifications" bson:"last_sync_notifications"`
}

type eeyesTask struct {
	ID                string     `json:"id" bson:"_id"`
	OwnerID           string     `json:"ownerId" bson:"owner_id"`
	DeviceID          string     `json:"deviceId" bson:"device_id"`
	Title             string     `json:"title" bson:"title"`
	Instructions      string     `json:"instructions" bson:"instructions"`
	Status            string     `json:"status" bson:"status"`
	Kind              string     `json:"kind,omitempty" bson:"kind,omitempty"`
	NotifyAt          *time.Time `json:"notifyAt,omitempty" bson:"notify_at,omitempty"`
	Reminders         []time.Time `json:"reminders,omitempty" bson:"reminders,omitempty"`
	DueAt             *time.Time `json:"dueAt,omitempty" bson:"due_at,omitempty"`
	PhotoIntervalSec  int        `json:"photoIntervalSec" bson:"photo_interval_sec"`
	MaxPhotos         int        `json:"maxPhotos" bson:"max_photos"`
	AudioSeconds      int        `json:"audioSeconds" bson:"audio_seconds"`
	CameraFacing      string     `json:"cameraFacing,omitempty" bson:"camera_facing,omitempty"`
	BatchID           string     `json:"batchId,omitempty" bson:"batch_id,omitempty"`
	StartedAt         *time.Time `json:"startedAt,omitempty" bson:"started_at,omitempty"`
	CompletedAt       *time.Time `json:"completedAt,omitempty" bson:"completed_at,omitempty"`
	CreatedAt         time.Time  `json:"createdAt" bson:"created_at"`
	UpdatedAt         time.Time  `json:"updatedAt" bson:"updated_at"`
	NotifiedKeys      []string   `json:"-" bson:"notified_keys,omitempty"`
	// Notification pipeline for hub diagnostics: first sync that carried the
	// notify key, and when the device acked showing it.
	NotifyDispatchedAt *time.Time `json:"notifyDispatchedAt,omitempty" bson:"notify_dispatched_at,omitempty"`
	NotifyAckedAt      *time.Time `json:"notifyAckedAt,omitempty" bson:"notify_acked_at,omitempty"`
}

type eeyesMedia struct {
	ID            string    `json:"id" bson:"_id"`
	OwnerID       string    `json:"ownerId" bson:"owner_id"`
	DeviceID      string    `json:"deviceId" bson:"device_id"`
	TaskID        string    `json:"taskId" bson:"task_id"`
	ClientMediaID string    `json:"clientMediaId" bson:"client_media_id"`
	Kind          string    `json:"kind" bson:"kind"`
	Mime          string    `json:"mime" bson:"mime"`
	Sha256        string    `json:"sha256" bson:"sha256"`
	Size          int64     `json:"size" bson:"size"`
	Width         int       `json:"width,omitempty" bson:"width,omitempty"`
	Height        int       `json:"height,omitempty" bson:"height,omitempty"`
	DurationMs    int       `json:"durationMs,omitempty" bson:"duration_ms,omitempty"`
	RelPath       string    `json:"-" bson:"rel_path"`
	CapturedAt    time.Time `json:"capturedAt" bson:"captured_at"`
	CreatedAt     time.Time `json:"createdAt" bson:"created_at"`
	Analysis      string    `json:"analysis,omitempty" bson:"analysis,omitempty"`
}

func (d *eeyesDevice) isLive(now time.Time) bool {
	if d == nil {
		return false
	}
	if d.RevokedAt != nil && !d.RevokedAt.IsZero() {
		return false
	}
	return now.Before(d.ExpiresAt)
}
