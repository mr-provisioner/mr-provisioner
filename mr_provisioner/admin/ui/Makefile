YARN := $(shell command -v yarn 2> /dev/null)

.PHONY: dist
dist:
ifdef YARN
	yarn install
else
	npm install
endif
	npm run build
