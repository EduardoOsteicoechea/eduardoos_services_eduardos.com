package main

import "testing"

func TestSMTPIdentitiesUseAuthenticatedMailboxWhenFromDiffers(t *testing.T) {
	header, envelope := smtpIdentities(config{
		SMTPFromAddress: "noreply@eduardoos.com",
		SMTPFromName:    "Eduardoos",
		SMTPUsername:    "user@gmail.com",
	})
	if envelope != "user@gmail.com" {
		t.Fatalf("envelope %q", envelope)
	}
	if header != "Eduardoos <user@gmail.com>" {
		t.Fatalf("header %q", header)
	}
}

func TestSMTPIdentitiesKeepMatchingFrom(t *testing.T) {
	header, envelope := smtpIdentities(config{
		SMTPFromAddress: "noreply@eduardoos.com",
		SMTPUsername:    "noreply@eduardoos.com",
	})
	if envelope != "noreply@eduardoos.com" || header != "noreply@eduardoos.com" {
		t.Fatalf("header=%q envelope=%q", header, envelope)
	}
}

func TestSMTPUsesStartTLSOnSubmissionPorts(t *testing.T) {
	if !smtpUsesStartTLS("587") || !smtpUsesStartTLS("25") || smtpUsesStartTLS("465") {
		t.Fatal("expected STARTTLS on 25/587 and implicit TLS on 465")
	}
}
