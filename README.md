# GNOME Shell Extension - Transparent Top Bar (Panel)

A GNOME Shell extension that brings back the transparent top bar and adds blur in GNOME Shell 3.38.

This basically comes from the feature
implementation [removed in GNOME Shell 3.32](https://gitlab.gnome.org/GNOME/gnome-shell/merge_requests/376/), and I
modified the code a bit to make it an extension. Enjoy!

## License

This program is distributed under the terms of the GNU General Public License, version 2 or later.

## Development

Enusre you have `sassc` installed. If not, install it: `sudo apt-get install -y sassc`

### Compile schemas and build extension
```
make
```
This will result in a zip file at `build/gnome-visuals-top-bar@evendanan.net.zip`

### Copy built extension to gnome
```
make install
```

### Testing locally

### My setup (gnome 3.38 on Wayland)
Run the make target `refresh`:
```
make refresh
```
This will clean, build and install the extension, then will start a nested wayland gnome session with the reloaded extension.

### Wayland

Start child shell instance with reloaded extensions
```
dbus-run-session -- gnome-shell --nested --wayland
```

### Xorg

Reload shell by pressing ALT+F2 type r in the input then enter.
