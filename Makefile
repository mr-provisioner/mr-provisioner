APP_DIR=app
FRONTEND_DIR=$(APP_DIR)/admin/ui
DOCS_DIR=docs

.PHONY: frontend
frontend:
	make -C $(FRONTEND_DIR)

.PHONY: lint
lint:
	flake8 $(APP_DIR) --exclude node_modules

.PHONY: docs
docs:
	make -C $(DOCS_DIR) html
