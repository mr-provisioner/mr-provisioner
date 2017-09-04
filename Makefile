APP_DIR=mr_provisioner
FRONTEND_DIR=$(APP_DIR)/admin/ui
DOCS_DIR=docs
TEST_CONFIG?=
PYTEST_ARGS?=

.PHONY: frontend
frontend:
	make -C $(FRONTEND_DIR)

.PHONY: lint
lint:
	flake8 $(APP_DIR) --exclude node_modules

.PHONY: docs
docs:
	make -C $(DOCS_DIR) html

.PHONY: dist
dist: frontend
	./setup.py sdist

.PHONY: test
test:
	@stat $(TEST_CONFIG) > /dev/null
	TEST_CONFIG=`readlink -f $(TEST_CONFIG)` pytest $(PYTEST_ARGS)
