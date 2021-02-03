.PHONY: build
build: $(wildcard src/*)
	mkdir -p build/
	glib-compile-schemas src/schemas/
	sassc src/stylesheet.scss src/stylesheet.css
	cd src/ && zip -r ../build/gnome-visuals-top-bar@evendanan.net.zip .
	zip -d build/gnome-visuals-top-bar@evendanan.net.zip stylesheet.scss
.PHONY: clean
clean:
	rm -rf build/
