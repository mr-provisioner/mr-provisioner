YARN := $(shell command -v yarn 2> /dev/null)

all: dist

.PHONY: deps
deps:
ifdef YARN
	yarn install
else
	npm install
endif

.PHONY: dist
dist: deps
	npm run build

.PHONY: dev
dev: deps
	npm run build-dev

.PHONY: watch-dev
watch-dev: deps
	npm run watch-dev

.PHONY: sync-deps
sync-deps:
	yarn install
	npm shrinkwrap
	mv npm-shrinkwrap.json package-lock.json
	npm install

.PHONY: clean
clean:
	rm -rf node_modules/
	rm -rf public/
