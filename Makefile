APP_DIR=app
FRONTEND_DIR=$(APP_DIR)/admin/ui

.PHONY: frontend
frontend:
	make -C $(FRONTEND_DIR)

.PHONY: lint
lint:
	flake8 $(APP_DIR) --exclude node_modules
