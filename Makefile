APP_DIR=mr_provisioner
FRONTEND_DIR=$(APP_DIR)/admin/ui
DOCS_DIR=docs
APIDOCS_DIR=$(DOCS_DIR)/apidocs
TEST_CONFIG?=
PYTEST_ARGS?=

.PHONY: frontend
frontend:
	make -C $(FRONTEND_DIR)

.PHONY: lint
lint:
	flake8 $(APP_DIR) --exclude node_modules

.PHONY: apidocs
apidocs:
	make -C $(APIDOCS_DIR) html

.PHONY: docs
docs: apidocs
	make -C $(DOCS_DIR) html

.PHONY: dist
dist: frontend
	./setup.py sdist

.PHONY: test
test:
	pytest $(PYTEST_ARGS)
