package main

import (
	"context"
	"fmt"
	"strings"
	"time"
)

func (a *App) startScribStreakReminderLoop() {
	if a == nil || a.scribStreak == nil {
		return
	}
	go a.scribStreakReminderLoop()
}

func (a *App) scribStreakReminderLoop() {
	loc := scribStreakCaracasLocation()
	for {
		now := time.Now().In(loc)
		next := nextScribStreakReminderAt(now)
		timer := time.NewTimer(time.Until(next))
		<-timer.C
		a.runScribStreakReminders(context.Background(), time.Now())
	}
}

func nextScribStreakReminderAt(now time.Time) time.Time {
	loc := scribStreakCaracasLocation()
	local := now.In(loc)
	candidate := time.Date(local.Year(), local.Month(), local.Day(), 3, 0, 0, 0, loc)
	if !local.Before(candidate) {
		candidate = candidate.AddDate(0, 0, 1)
	}
	return candidate
}

func (a *App) runScribStreakReminders(ctx context.Context, now time.Time) {
	date := scribStreakTodayDate(now)
	configs, err := a.scribStreak.ListEnabledReminderConfigs(ctx)
	if err != nil {
		if a.cfg.MustLog {
			a.log.Info("scrib.streak.reminder.list_error", "err", err.Error())
		}
		return
	}
	for _, cfg := range configs {
		a.sendScribStreakReminderForUser(ctx, cfg, date, now)
	}
}

func (a *App) sendScribStreakReminderForUser(ctx context.Context, cfg scribStreakConfig, date string, now time.Time) {
	if !cfg.Enabled || !cfg.ReminderEnabled || len(cfg.Items) == 0 {
		return
	}
	if date < cfg.StartDate {
		return
	}
	if _, err := a.scribStreak.GetReminder(ctx, cfg.UserID, date); err == nil {
		return
	}
	if day, err := a.scribStreak.GetDay(ctx, cfg.UserID, date); err == nil && day != nil && day.Completed {
		return
	}
	user, err := a.store.UserByID(ctx, cfg.UserID)
	if err != nil || user == nil || strings.TrimSpace(user.Email) == "" {
		return
	}
	assignments, err := buildDayAssignments(&cfg, a.calvinRoot())
	if err != nil {
		if a.cfg.MustLog {
			a.log.Info("scrib.streak.reminder.assign_error", "user_id", cfg.UserID, "err", err.Error())
		}
		return
	}
	var b strings.Builder
	b.WriteString("Buenos días. Tu asignación Scrib de hoy (" + date + "):\n\n")
	for _, asg := range assignments {
		label := asg.Label
		if label == "" {
			label = asg.ItemID
		}
		b.WriteString("- ")
		b.WriteString(label)
		b.WriteString(": ")
		parts := make([]string, 0, len(asg.Units))
		for _, u := range asg.Units {
			parts = append(parts, u.Label)
		}
		b.WriteString(strings.Join(parts, ", "))
		b.WriteString("\n")
	}
	b.WriteString("\nAbre https://eduardoos.com/scrib?view=streak-today para completar el día.\n")
	subject := fmt.Sprintf("Scrib · asignación del %s", date)
	if err := a.mailer.Send(user.Email, subject, b.String()); err != nil {
		if a.cfg.MustLog {
			a.log.Info("scrib.streak.reminder.send_error", "user_id", cfg.UserID, "err", err.Error())
		}
		return
	}
	sentAt := now.UTC().Format(time.RFC3339)
	_ = a.scribStreak.SaveReminder(ctx, &scribStreakReminder{
		UserID:    cfg.UserID,
		Date:      date,
		SentAt:    sentAt,
		CreatedAt: sentAt,
	})
	if a.cfg.MustLog {
		a.log.Info("scrib.streak.reminder.sent", "user_id", cfg.UserID, "date", date)
	}
}
