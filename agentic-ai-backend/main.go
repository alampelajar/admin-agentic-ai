package main

import (
	"log"
	"net/http"

	"agentic-ai-backend/config"
	"agentic-ai-backend/handlers"
)

func enableCORS(next http.Handler) http.Handler {
	allowedOrigins := map[string]bool{
		"http://localhost:5173": true,
		"http://localhost:5175": true,
		"http://localhost:5176": true,
		"http://127.0.0.1:5173": true,
		"http://127.0.0.1:5175": true,
		"http://127.0.0.1:5176": true,
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		allowed := allowedOrigins[origin]

		if allowed {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Add("Vary", "Origin")
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == http.MethodOptions {
			if !allowed {
				http.Error(w, "Origin not allowed", http.StatusForbidden)
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	config.ConnectDatabase()

	mux := http.NewServeMux()

	mux.HandleFunc("/api/admin/login", handlers.AdminLogin)
	mux.HandleFunc("/api/admin/refresh", handlers.AdminRefresh)

	log.Println("Backend server berjalan di http://localhost:8081")

	err := http.ListenAndServe(":8081", enableCORS(mux))
	if err != nil {
		log.Fatal("Server gagal dijalankan:", err)
	}
}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	config.ConnectDatabase()

	mux := http.NewServeMux()

	mux.HandleFunc("/api/admin/login", handlers.AdminLogin)
	mux.HandleFunc("/api/admin/refresh", handlers.AdminRefresh)

	log.Println("Backend server berjalan di http://localhost:8081")

	err := http.ListenAndServe(":8081", enableCORS(mux))
	if err != nil {
		log.Fatal("Server gagal dijalankan:", err)
	}
}