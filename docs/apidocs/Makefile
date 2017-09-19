.PHONY: html
html:
ifdef YARN
	yarn install
else
	npm install
endif
	mkdir -p public
	npm run build-v1
