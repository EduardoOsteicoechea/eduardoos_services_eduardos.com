package main

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"strings"
	"sync"
	"time"
)

type outgoingMail struct {
	To      string
	Subject string
	Body    string
}

type Mailer interface {
	Send(to, subject, body string) error
}

type recordingMailer struct {
	mu      sync.Mutex
	last    outgoingMail
	fail    bool
	sends   int
	lastErr error
}

func (m *recordingMailer) Send(to, subject, body string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sends++
	m.last = outgoingMail{To: to, Subject: subject, Body: body}
	if m.fail {
		m.lastErr = fmt.Errorf("mail failed")
		return m.lastErr
	}
	return nil
}

func (m *recordingMailer) Last() outgoingMail {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.last
}

type smtpMailer struct {
	cfg config
}

func (m smtpMailer) Send(to, subject, body string) error {
	if m.cfg.SMTPHost == "" || m.cfg.SMTPPort == "" {
		return fmt.Errorf("smtp not configured")
	}
	addr := net.JoinHostPort(m.cfg.SMTPHost, m.cfg.SMTPPort)
	from := m.cfg.SMTPFromAddress
	msg := strings.Join([]string{
		"From: " + from,
		"To: " + to,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=utf-8",
		"",
		body,
	}, "\r\n")

	dialer := &net.Dialer{Timeout: 10 * time.Second}
	conn, err := tls.DialWithDialer(dialer, "tcp", addr, &tls.Config{ServerName: m.cfg.SMTPHost, MinVersion: tls.VersionTLS12})
	if err != nil {
		return fmt.Errorf("smtp unavailable")
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, m.cfg.SMTPHost)
	if err != nil {
		return fmt.Errorf("smtp unavailable")
	}
	defer client.Close()

	if m.cfg.SMTPUsername != "" {
		auth := smtp.PlainAuth("", m.cfg.SMTPUsername, m.cfg.SMTPPassword, m.cfg.SMTPHost)
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("smtp unavailable")
		}
	}
	if err := client.Mail(from); err != nil {
		return fmt.Errorf("smtp unavailable")
	}
	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("smtp unavailable")
	}
	writer, err := client.Data()
	if err != nil {
		return fmt.Errorf("smtp unavailable")
	}
	if _, err := writer.Write([]byte(msg)); err != nil {
		return fmt.Errorf("smtp unavailable")
	}
	if err := writer.Close(); err != nil {
		return fmt.Errorf("smtp unavailable")
	}
	return client.Quit()
}
