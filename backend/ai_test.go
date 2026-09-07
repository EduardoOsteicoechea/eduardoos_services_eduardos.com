package main

import "testing"

func TestKimiChatPayloadOmitsTemperature(t *testing.T) {
	c := openAICompatClient{name: "kimi", model: "kimi-k2.6"}
	payload := c.chatPayload("hello")
	if _, ok := payload["temperature"]; ok {
		t.Fatal("kimi-k2.6 rejects any temperature value")
	}
	thinking, ok := payload["thinking"].(map[string]string)
	if !ok || thinking["type"] != "disabled" {
		t.Fatalf("expected thinking disabled, got %#v", payload["thinking"])
	}
}

func TestDeepSeekChatPayloadKeepsTemperature(t *testing.T) {
	c := openAICompatClient{name: "deepseek", model: "deepseek-v4-flash"}
	payload := c.chatPayload("hello")
	if payload["temperature"] != 0.2 {
		t.Fatalf("deepseek temperature: %#v", payload["temperature"])
	}
	if _, ok := payload["thinking"]; ok {
		t.Fatal("deepseek must not receive the kimi thinking field")
	}
}
