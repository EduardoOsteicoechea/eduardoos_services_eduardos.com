package main

import "os"

const (
	siteName    = "eduardoos.com"
	defaultPort = "8081"
	listenHost  = "127.0.0.1"
)

type config struct {
	ListenAddr string
	MongoURI   string
}

func loadConfig() config {
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	return config{
		ListenAddr: listenHost + ":" + port,
		MongoURI:   os.Getenv("MONGO_URI"),
	}
}
