const {Meta, St} = imports.gi;

const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

/**
 * https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout
 * https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/clearTimeout
 */
window.setTimeout = function(func, delay, ...args) {
    return GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
        func(...args);
        return GLib.SOURCE_REMOVE;
    });
};

window.clearTimeout = GLib.source_remove;


function getSettings() {
    let GioSSS = Gio.SettingsSchemaSource;
    let schemaSource = GioSSS.new_from_directory(
        Me.dir.get_child("schemas").get_path(),
        GioSSS.get_default(),
        false
    );
    let schemaObj = schemaSource.lookup(
        'net.evendanan.gnome.topBarVisual', true);
    if (!schemaObj) {
        throw new Error('cannot find schemas');
    }
    return new Gio.Settings({settings_schema: schemaObj});
}

class Extension {
    constructor() {
        this._settings = getSettings();
        this._currentTransparency = this._settings.get_int('transparency');
        this._currentBlur = this._settings.get_int('blur');
        this.settingChangeDebounce = null;
    }

    enable() {
        this._
        this._settings.connect('changed', this.topBarVisualSettingsChanged.bind(this));

        for (const metaWindowActor of global.get_window_actors()) {
            this._onWindowActorAdded(metaWindowActor.get_parent(), metaWindowActor);
        }

        this._updateTopBarVisual();
    }

    topBarVisualSettingsChanged(settings, key) {
        if (key === 'transparency') {
            clearTimeout(this.settingChangeDebounce);
            this.settingChangeDebounce = setTimeout(() => {
                Main.panel.remove_style_class_name('transparent-top-bar--transparent-' + this._currentTransparency);
                this._updateTopBarVisual();
                this._currentTransparency = this._settings.get_int('transparency');
            }, 500);
        } else if (key === 'blur') {
            clearTimeout(this.settingChangeDebounce);
            this.settingChangeDebounce = setTimeout(() => {
                Main.panel.remove_style_class_name('transparent-top-bar--blur-' + this._currentBlur);
                this._updateTopBarVisual();
                this._currentBlur = this._settings.get_int('blur');
            }, 500);
        }
    }

    disable() {
        this._setTopBarVisual(false);
    }

    _updateTopBarVisual() {
        if (!Main.layoutManager.primaryMonitor) {
            return;
        }

        this._setTopBarVisual(true);
    }

    _setTopBarVisual(enabled) {
        const transparency = this._settings.get_int("transparency");
        const blur = this._settings.get_int("blur");
        if (enabled) {
            Main.panel.remove_style_class_name('transparent-top-bar--solid');
            Main.panel.add_style_class_name('transparent-top-bar--not-solid');
            Main.panel.add_style_class_name('transparent-top-bar--transparent-' + transparency);
            Main.panel.add_style_class_name('transparent-top-bar--blur-' + blur);
        } else {
            Main.panel.add_style_class_name('transparent-top-bar--solid');
            Main.panel.remove_style_class_name('transparent-top-bar--not-solid');
            Main.panel.remove_style_class_name('transparent-top-bar--transparent-' + transparency);
            Main.panel.remove_style_class_name('transparent-top-bar--blur-' + blur);
        }
    }

};

function init() {
    return new Extension();
}
