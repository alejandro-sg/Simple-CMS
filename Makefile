.PHONY: dev api admin website install setup build clean help

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

setup: ## Copy .env examples → .env files (run once after clone)
	@[ -f api/.env ] || (cp api/.env.example api/.env && echo "✓ Created api/.env — fill in your values")
	@[ -f admin/.env.local ] || (cp admin/.env.local.example admin/.env.local && echo "✓ Created admin/.env.local")
	@[ -f website/.env.local ] || (cp website/.env.local.example website/.env.local && echo "✓ Created website/.env.local")

install: ## Install Node dependencies for admin and website
	cd admin && npm install
	cd website && npm install

dev: ## Start all services — API :8080  admin :3001  website :3000
	@printf "\n  \033[1mSimple-CMS local dev\033[0m\n"
	@printf "  API     → \033[4mhttp://localhost:8080\033[0m\n"
	@printf "  Admin   → \033[4mhttp://localhost:3001\033[0m\n"
	@printf "  Website → \033[4mhttp://localhost:3000\033[0m\n\n"
	@trap 'kill %1 %2 %3 2>/dev/null; exit 0' INT TERM; \
		(cd api && go run .) & \
		(cd admin && npm run dev) & \
		(cd website && npm run dev) & \
		wait

api: ## Start Go API only (:8080)
	cd api && go run .

admin: ## Start admin UI only (:3001)
	cd admin && npm run dev

website: ## Start public website only (:3000)
	cd website && npm run dev

build: ## Build Go binary + Next.js apps for production
	cd api && go build -o simple-cms-api .
	cd admin && npm run build
	cd website && npm run build

clean: ## Remove build artifacts and node_modules
	rm -rf admin/.next admin/node_modules
	rm -rf website/.next website/node_modules
	rm -f api/simple-cms-api
