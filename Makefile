.PHONY: build
OUTOUT_NAME ?= gnome-visuals-top-bar@evendanan.net
build: $(wildcard src/*)
	mkdir -p build/
	glib-compile-schemas src/schemas/
	sassc src/stylesheet.scss src/stylesheet.css
	cd src/ && zip -r ../build/$(OUTOUT_NAME).zip .
	zip -d build/$(OUTOUT_NAME).zip stylesheet.scss
.PHONY: clean
clean:
	rm -rf build/
install:
	gnome-extensions install -f build/$(OUTOUT_NAME).zip
	gnome-extensions enable $(OUTOUT_NAME)
