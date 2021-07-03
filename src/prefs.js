const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const Me = imports.misc.extensionUtils.getCurrentExtension();

function init() {
}

function buildPrefsWidget() {
    let widget = new MyPrefsWidget();
    widget.show_all();
    return widget;
}

function getSettings() {
    let GioSSS = Gio.SettingsSchemaSource;
    let schemaSource = GioSSS.new_from_directory(
        Me.dir.get_child("schemas").get_path(),
        GioSSS.get_default(),
        false
    );
    let schemaObj = schemaSource.lookup(
        'com.codeIX9.blurred-gnome', true);
    if (!schemaObj) {
        throw new Error('cannot find schemas');
    }
    return new Gio.Settings({settings_schema: schemaObj});
}

const MyPrefsWidget = GObject.registerClass(
    class MyPrefsWidget extends Gtk.Box {

        _init(params) {

            super._init(params);

            this.margin = 20;
            this.set_spacing(15);
            this.set_orientation(Gtk.Orientation.VERTICAL);
            this.settings = getSettings();

            this.connect('destroy', Gtk.main_quit);

            const _this = this;

            //theme prefs
            let themeBox = new Gtk.Box();
            themeBox.set_orientation(Gtk.Orientation.HORIZONTAL);

            let themeLabel = new Gtk.Label({
                label: "Dark Theme"
            });
            themeBox.pack_start(themeLabel, false, false, 0);

            let themeSwitch = new Gtk.Switch();
            themeSwitch.set_active(this.settings.get_boolean("dark-theme"));

            themeSwitch.connect("notify::active", function (w) {
                _this.settings.set_boolean("dark-theme", w.active);
            });
            themeBox.pack_end(themeSwitch, false, false, 0);
            this.add(themeBox);

            //top bar prefs
            let transparentBox = new Gtk.Box();
            let topBar = new Gtk.Label({
                label: "Top Bar Settings"
            });
            transparentBox.pack_start(topBar, false, true, 6);

            transparentBox.set_orientation(Gtk.Orientation.VERTICAL);
            let transparentLabel = new Gtk.Label({
                label: "Top bar transparency (%)"
            });
            transparentBox.pack_start(transparentLabel, false, false, 0);

            let transparentScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.0, 100.0, 1.0);
            transparentScale.set_value(this.settings.get_int("top-bar-transparency"));

            transparentScale.connect("value-changed", function (w) {
                _this.settings.set_int("top-bar-transparency", w.get_value());
            });
            transparentBox.pack_end(transparentScale, false, false, 0);

            this.add(transparentBox);

            //transparent-on-full-screen prefs
            let transparentBoxFull = new Gtk.Box();
            transparentBoxFull.set_orientation(Gtk.Orientation.VERTICAL);

            let transparentFullLabel = new Gtk.Label({
                label: "Top bar transparency when full screen (%)"
            });
            transparentBoxFull.pack_start(transparentFullLabel, false, false, 0);

            let transparentFullScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.0, 100.0, 1.0);
            transparentFullScale.set_value(this.settings.get_int("top-bar-transparency-full"));

            transparentFullScale.connect("value-changed", function (w) {
                _this.settings.set_int("top-bar-transparency-full", w.get_value());
            });
            transparentBoxFull.pack_end(transparentFullScale, false, false, 0);

            this.add(transparentBoxFull);

            //blur prefs
            let blurBox = new Gtk.Box();
            blurBox.set_orientation(Gtk.Orientation.VERTICAL);

            let blurLabel = new Gtk.Label({
                label: "Top bar blurring (%)"
            });
            blurBox.pack_start(blurLabel, false, false, 0);

            let blurScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.0, 100.0, 1.0);
            blurScale.set_value(this.settings.get_int("top-bar-blur"));

            blurScale.connect("value-changed", function (w) {
                _this.settings.set_int("top-bar-blur", w.get_value());
            });
            blurBox.pack_end(blurScale, false, false, 0);

            this.add(blurBox);
        }

    });
