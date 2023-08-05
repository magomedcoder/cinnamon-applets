const GLib = imports.gi.GLib;
const Gettext = imports.gettext;
const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;

const UUID = "WireGuard@Magomedcoder";

Gettext.bindtextdomain(UUID, GLib.get_home_dir() + "./local/share/locale");

const WireGuardApplet = class WireGuardApplet extends Applet.IconApplet {

    constructor(orientation, panel_height, instance_id) {
        super(orientation, panel_height, instance_id);
        this.set_applet_icon_name("status-off");
        this.set_applet_tooltip(_("WireGuard"));
        this._orientation = orientation;
        this._menu_manager = null;
        this._menu = null;
    }

    on_applet_added_to_panel() {
        if (!this._menu_manager) {
            this._menu_manager = new PopupMenu.PopupMenuManager(this);
            this._menu = new Applet.AppletPopupMenu(this, this._orientation);
            this._menu_manager.addMenu(this._menu);
        }
    }

    on_applet_removed_from_panel() {
        if (this._menu_manager) {
            this._menu_manager.removeMenu(this._menu);
            this._menu = null;
            this._menu_manager = null;
        }
    }

    on_applet_clicked() {
        if (this._menu) {
            this._menu.toggle();
        }
    }

    on_item_toggled(iface, object, enable) {
        object.setToggleState(!enable);
    }

}

function _(str) {
    return Gettext.dgettext(UUID, str);
}

function main(metadata, orientation) {
    return new WireGuardApplet(orientation);
}
