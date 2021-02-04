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
refresh: clean build install
	dbus-run-session -- env MUTTER_DEBUG_NUM_DUMMY_MONITORS=1 MUTTER_DEBUG_DUMMY_MONITOR_SCALES=2 MUTTER_DEBUG_DUMMY_MODE_SPECS=2560x1440 gnome-shell --nested --wayland
