package main

import "testing"

func TestKimiChatPayloadOmitsTemperature(t *testing.T) {
	c := openAICompatClient{name: "kimi", model: "kimi-k3"}
	payload := c.chatPayload("hello")
	if _, ok := payload["temperature"]; ok {
		t.Fatal("kimi-k3 rejects any temperature value")
	}
	if _, ok := payload["thinking"]; ok {
		t.Fatal("kimi-k3 rejects the k2.x thinking flag")
	}
	if payload["reasoning_effort"] != "low" {
		t.Fatalf("expected low reasoning effort, got %#v", payload["reasoning_effort"])
	}
	if payload["model"] != "kimi-k3" {
		t.Fatalf("model %v", payload["model"])
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
