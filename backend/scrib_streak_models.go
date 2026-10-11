package main

import "time"

const scribStreakKindBible = "bible"
const scribStreakKindInstitutes = "institutes"

type scribStreakBibleCursor struct {
	BibleBookID string `json:"bibleBookId" bson:"bibleBookId"`
	Chapter     int    `json:"chapter" bson:"chapter"`
	Verse       int    `json:"verse" bson:"verse"`
}

type scribStreakInstitutesCursor struct {
	ParagraphID string `json:"paragraphId" bson:"paragraphId"`
}

type scribStreakCursor struct {
	Bible      *scribStreakBibleCursor      `json:"bible,omitempty" bson:"bible,omitempty"`
	Institutes *scribStreakInstitutesCursor `json:"institutes,omitempty" bson:"institutes,omitempty"`
}

type scribStreakItem struct {
	ID              string            `json:"id" bson:"id"`
	Kind            string            `json:"kind" bson:"kind"`
	Label           string            `json:"label" bson:"label"`
	QuantityPerDay  int               `json:"quantityPerDay" bson:"quantityPerDay"`
	ScribBookID     string            `json:"scribBookId" bson:"scribBookId"`
	ScribSheetID    string            `json:"scribSheetId" bson:"scribSheetId"`
	Cursor          scribStreakCursor `json:"cursor" bson:"cursor"`
	StartCursor     scribStreakCursor `json:"startCursor" bson:"startCursor"`
}

type scribStreakConfig struct {
	UserID          string            `json:"-" bson:"_id"`
	Enabled         bool              `json:"enabled" bson:"enabled"`
	StartDate       string            `json:"startDate" bson:"startDate"` // YYYY-MM-DD Caracas
	ReminderEnabled bool              `json:"reminderEnabled" bson:"reminderEnabled"`
	Items           []scribStreakItem `json:"items" bson:"items"`
	UpdatedAt       string            `json:"updatedAt" bson:"updatedAt"`
}

type scribStreakAssignmentUnit struct {
	Kind        string `json:"kind" bson:"kind"`
	BibleBookID string `json:"bibleBookId,omitempty" bson:"bibleBookId,omitempty"`
	Chapter     int    `json:"chapter,omitempty" bson:"chapter,omitempty"`
	Verse       int    `json:"verse,omitempty" bson:"verse,omitempty"`
	ParagraphID string `json:"paragraphId,omitempty" bson:"paragraphId,omitempty"`
	Label       string `json:"label" bson:"label"`
}

type scribStreakDayAssignment struct {
	ItemID       string                      `json:"itemId" bson:"itemId"`
	Label        string                      `json:"label" bson:"label"`
	Kind         string                      `json:"kind" bson:"kind"`
	ScribBookID  string                      `json:"scribBookId" bson:"scribBookId"`
	ScribSheetID string                      `json:"scribSheetId" bson:"scribSheetId"`
	Units        []scribStreakAssignmentUnit `json:"units" bson:"units"`
	SnapshotID   string                      `json:"snapshotId,omitempty" bson:"snapshotId,omitempty"`
}

type scribStreakDay struct {
	Key         string                     `json:"-" bson:"_id"`
	UserID      string                     `json:"-" bson:"user_id"`
	Date        string                     `json:"date" bson:"date"`
	Completed   bool                       `json:"completed" bson:"completed"`
	CompletedAt string                     `json:"completedAt,omitempty" bson:"completedAt,omitempty"`
	Assignments []scribStreakDayAssignment `json:"assignments" bson:"assignments"`
	UpdatedAt   string                     `json:"updatedAt" bson:"updatedAt"`
}

type scribStreakSnapshot struct {
	ID           string     `json:"id" bson:"_id"`
	UserID       string     `json:"-" bson:"user_id"`
	Date         string     `json:"date" bson:"date"`
	ItemID       string     `json:"itemId" bson:"itemId"`
	ScribBookID  string     `json:"scribBookId" bson:"scribBookId"`
	ScribSheetID string     `json:"scribSheetId" bson:"scribSheetId"`
	Sheet        scribSheet `json:"sheet" bson:"sheet"`
	CreatedAt    string     `json:"createdAt" bson:"createdAt"`
}

type scribStreakReminder struct {
	Key       string `json:"-" bson:"_id"`
	UserID    string `json:"-" bson:"user_id"`
	Date      string `json:"date" bson:"date"`
	SentAt    string `json:"sentAt" bson:"sentAt"`
	CreatedAt string `json:"createdAt" bson:"createdAt"`
}

type scribStreakStats struct {
	CurrentStreak int    `json:"currentStreak"`
	BestStreak    int    `json:"bestStreak"`
	CompletedDays int    `json:"completedDays"`
	LastCompleted string `json:"lastCompleted,omitempty"`
	TodayDate     string `json:"todayDate"`
	TodayDone     bool   `json:"todayDone"`
}

func scribStreakCaracasLocation() *time.Location {
	loc, err := time.LoadLocation("America/Caracas")
	if err != nil {
		return time.FixedZone("America/Caracas", -4*60*60)
	}
	return loc
}

func scribStreakTodayDate(now time.Time) string {
	return now.In(scribStreakCaracasLocation()).Format("2006-01-02")
}

func scribStreakDayKey(userID, date string) string {
	return userID + ":" + date
}

func scribStreakReminderKey(userID, date string) string {
	return userID + ":" + date
}
