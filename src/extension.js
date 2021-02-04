const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Meta = imports.gi.Meta;
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Shell = imports.gi.Shell;
const Clutter = imports.gi.Clutter;

const SHELL_BLUR_MODE_ACTOR = 0;
const PANEL_CONTAINER_NAME = 'net.evendanan.gnome.topBarVisual_panel_container';

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
        this._actorSignalIds = null;
        this._windowSignalIds = null;
        this._settings = getSettings();
        this._currentTransparency = this._settings.get_int('transparency');
        this._currentBlur = this._settings.get_int('blur');
        this.settingChangeDebounce = null;
    }

    enable() {
        this._
        this._actorSignalIds = new Map();
        this._windowSignalIds = new Map();

        this._settings.connect('changed', this._topBarVisualSettingsChanged.bind(this));
        this._actorSignalIds.set(Main.overview, [
            Main.overview.connect('showing', this._updateTopBarVisual.bind(this)),
            Main.overview.connect('hiding', this._updateTopBarVisual.bind(this))
        ]);

        this._actorSignalIds.set(Main.sessionMode, [
            Main.sessionMode.connect('updated', this._updateTopBarVisual.bind(this))
        ]);

        for (const metaWindowActor of global.get_window_actors()) {
            this._onWindowActorAdded(metaWindowActor.get_parent(), metaWindowActor);
        }

        this._actorSignalIds.set(global.window_group, [
            global.window_group.connect('actor-added', this._onWindowActorAdded.bind(this)),
            global.window_group.connect('actor-removed', this._onWindowActorRemoved.bind(this))
        ]);

        this._actorSignalIds.set(global.window_manager, [
            global.window_manager.connect('switch-workspace', this._updateTopBarVisual.bind(this))
        ]);

        this._updateTopBarVisual();
    }

    _topBarVisualSettingsChanged(settings, key) {
        clearTimeout(this.settingChangeDebounce);
        this.settingChangeDebounce = setTimeout(() => {
            this._updateTopBarVisual();
        }, 125);
    }

    disable() {
        for (const actorSignalIds of [this._actorSignalIds, this._windowSignalIds]) {
            for (const [actor, signalIds] of actorSignalIds) {
                for (const signalId of signalIds) {
                    actor.disconnect(signalId);
                }
            }
        }
        this._actorSignalIds = null;
        this._windowSignalIds = null;

        this._setTopBarVisual(false);
    }

    _onWindowActorAdded(container, metaWindowActor) {
        this._windowSignalIds.set(metaWindowActor, [
            metaWindowActor.connect('notify::allocation', this._updateTopBarVisual.bind(this)),
            metaWindowActor.connect('notify::visible', this._updateTopBarVisual.bind(this))
        ]);
    }

    _onWindowActorRemoved(container, metaWindowActor) {
        for (const signalId of this._windowSignalIds.get(metaWindowActor)) {
            metaWindowActor.disconnect(signalId);
        }
        this._windowSignalIds.delete(metaWindowActor);
        this._updateTopBarVisual();
    }

    _updateTopBarVisual() {
        if (!Main.layoutManager.primaryMonitor) {
            return;
        }

        this._setTopBarVisual(true);
    }

    _setTopBarVisual(enabled) {
        if (enabled) {
            //need to determine which transparency to use: full-window or regular

            // Get all the windows in the active workspace that are in the primary monitor and visible.
            const workspaceManager = global.workspace_manager;
            const activeWorkspace = workspaceManager.get_active_workspace();
            const windows = activeWorkspace.list_windows().filter(metaWindow => {
                return metaWindow.is_on_primary_monitor()
                    && metaWindow.showing_on_its_workspace()
                    && !metaWindow.is_hidden()
                    && metaWindow.get_window_type() !== Meta.WindowType.DESKTOP;
            });

            // Check if at least one window is near enough to the panel.
            const panelTop = Main.panel.get_transformed_position()[1];
            const panelBottom = panelTop + Main.panel.get_height();
            const scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;
            const isNearEnough = windows.some(metaWindow => {
                const verticalPosition = metaWindow.get_frame_rect().y;
                return verticalPosition < panelBottom + 5 * scale;
            });
            
            const transparency = isNearEnough? this._settings.get_int("transparency-full") : this._settings.get_int("transparency");
            const transparencyChanged = transparency !== this._currentTransparency;
            const blur = this._settings.get_int("blur");
            const blurChanged = blur !== this._currentBlur;
            

            Main.panel.remove_style_class_name('transparent-top-bar--solid');
            Main.panel.add_style_class_name('transparent-top-bar--not-solid');
            if (transparencyChanged) {
                Main.panel.remove_style_class_name('transparent-top-bar--transparent-' + this._currentTransparency);
            }
            
            log("transparent is: "+transparency);
            Main.panel.add_style_class_name('transparent-top-bar--transparent-' + transparency);
            if (blurChanged) {
                this._removeBlurredActors(Main.layoutManager.panelBox, PANEL_CONTAINER_NAME);
            }
            this._createBlurredPanelActor(100, blur);

            this._currentTransparency = transparency;
            this._currentBlur = blur;
        } else {
            log("clearing all effects");
            Main.panel.add_style_class_name('transparent-top-bar--solid');
            Main.panel.remove_style_class_name('transparent-top-bar--not-solid');
            Main.panel.remove_style_class_name('transparent-top-bar--transparent-' + this._currentTransparency);
            this._removeBlurredActors(Main.layoutManager.panelBox, PANEL_CONTAINER_NAME);
        }
    }

    //Blur logic taken from https://github.com/yozoon/gnome-shell-extension-blyr

    _createBlurredPanelActor(brightness, blur) {
        // Remove current blurred panel bgs
        this._removeBlurredActors(Main.layoutManager.panelBox, PANEL_CONTAINER_NAME);

        // Update backgrounds to prevent ghost actors
        Main.overview._updateBackgrounds();

        // Create list of backgrounds with full opacity
        let bgs = [];
        Main.overview._backgroundGroup.get_children().forEach(
            (bg) => {
                if (bg.opacity == 255 && bg.visible) {
                    bgs.push(bg);
                }
            });

        // Calculate index of primary background
        // Check wheter the global display object has a get_primary_monitor method
        if (global.display.get_primary_monitor == undefined) {
            var bgIndex = bgs.length - global.screen.get_primary_monitor() - 1;
        } else {
            var bgIndex = bgs.length - global.display.get_primary_monitor() - 1;
        }

        // Select primary background
        this.primaryBackground = bgs[bgIndex];

        // Clutter Actor with height 0 which will contain the actual blurred background
        this.panelContainer = new Clutter.Actor({
            name: PANEL_CONTAINER_NAME,
            width: 0,
            height: 0,
        });

        let [tpx, tpy] = Main.layoutManager.panelBox.get_transformed_position();

        // Clone primary background instance (we need to clone it, not just 
        // assign it, so we can modify it without influencing the main 
        // desktop background)
        this.panel_bg = new Meta.BackgroundActor({
            monitor: this.primaryBackground.monitor,
            content: this.primaryBackground.content,
            width: Main.layoutManager.panelBox.width,
            height: Main.layoutManager.panelBox.width,
            x: parseFloat(-1.0 * tpx),
            y: parseFloat(-1.0 * tpy),
        });
        
        this.panel_bg.content.vignette = false;
        this.panel_bg.content.brightness = 1.0;
        this.panel_bg.content.gradient = false;

        // Only show one part of the panel background actor as large as the 
        // panel itself
        this.panel_bg.set_clip(
            tpx,
            tpy,
            Main.layoutManager.panelBox.width,
            Main.layoutManager.panelBox.height);

        this.panel_bg.set_opacity(255);

        let panel_brightness = 1.0;
        let intensity = 30.0 * (blur / 100.0);
        log("blur intensity is "+intensity)
        // Apply the blur effect to the panel background
        this._applyTwoPassBlur(this.panel_bg, intensity, panel_brightness);

        // Add the background texture to the background container
        this.panelContainer.add_actor(this.panel_bg);

        // Add the background container to the system panel box
        Main.layoutManager.panelBox.add_actor(this.panelContainer);
        Main.layoutManager.panelBox.set_child_at_index(this.panelContainer, 0);
    }

    /***************************************************************
     *            Blur Effect and Animation Utilities              *
     ***************************************************************/
    _applyTwoPassBlur(actor, intensity, brightness = 1.0) {
        if (!actor.get_effect('blur')) {
            actor.add_effect_with_name('blur', new Shell.BlurEffect({
                mode: SHELL_BLUR_MODE_ACTOR,
                brightness: parseFloat(brightness),
                sigma: parseFloat(intensity),
            }));
        }
    }

    /***************************************************************
     *                   Restore Shell State                       *
     ***************************************************************/
    _removeBlurredActors(parent, name) {
        parent.get_children().forEach(
            (child) => {
                if (child.name == name) {
                    parent.remove_child(child);
                    child.destroy();
                }
            }
        )
    }
};

function init() {
    return new Extension();
}
