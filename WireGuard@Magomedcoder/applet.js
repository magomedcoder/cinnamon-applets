const GLib = imports.gi.GLib;
const Gettext = imports.gettext;
const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;
const Gio = imports.gi.Gio;

const UUID = "WireGuard@Magomedcoder";

Gettext.bindtextdomain(UUID, GLib.get_home_dir() + "./local/share/locale");

const WireGuardApplet = class WireGuardApplet extends Applet.IconApplet {

    constructor(orientation, panel_height, instance_id) {
        super(orientation, panel_height, instance_id);
        this.set_applet_icon_name("status-off");
        this.set_applet_tooltip(_("WireGuard"));
        this.orientation = orientation;
        this.menuManager = null;
        this.menu = null;
        this.netInterfaces = null;
        this.wireGuardInterfaces = null;
    }

    getNetInterfaces() {
        try {
            const interfaces = [];
            for (let file, enumerator = Gio.file_new_for_path("/sys/class/net").enumerate_children("standard::name", Gio.FileQueryInfoFlags.NONE, null); (file = enumerator.next_file(null)) !== null;) {
                interfaces.push(file.get_name());
            }
            return interfaces;
        } catch (e) {
            return [];
        }
    }

    getWireGuardInterfaces() {
        try {
            const interfaces = [];
            for (let file, enumerator = Gio.file_new_for_path("/etc/wireguard").enumerate_children("standard::name", Gio.FileQueryInfoFlags.NONE, null); (file = enumerator.next_file(null)) !== null;) {
                if (file.get_file_type() == Gio.FileType.REGULAR && file.get_name().endsWith(".conf")) {
                    interfaces.push(file.get_name().slice(0, -5));
                }
            }
            return interfaces;
        } catch (e) {
            return [];
        }
    }

    on_applet_added_to_panel() {
        if (!this.menuManager) {
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menu = new Applet.AppletPopupMenu(this, this.orientation);
            this.menuManager.addMenu(this.menu);
        }
        if (!this.netInterfaces) {
            this.netInterfaces = this.getNetInterfaces();
        }
        if (!this.wireGuardInterfaces) {
            this.wireGuardInterfaces = this.getWireGuardInterfaces();
        }
    }

    on_applet_removed_from_panel() {
        if (this.menuManager) {
            this.menuManager.removeMenu(this.menu);
            this.menu = null;
            this.menuManager = null;
        }
        if (this.netInterfaces) {
            this.netInterfaces = null;
        }
        if (this.wireGuardInterfaces) {
            this.wireGuardInterfaces = null;
        }
    }

    on_applet_clicked() {
        if (this.menu) {
            this.menu.toggle();
        }
    }

    on_item_toggled(iface, object, enable) {
        object.setToggleState(!enable);
        console.log(this.netInterfaces)
        console.log(this.wireGuardInterfaces)
    }

}

function _(str) {
    return Gettext.dgettext(UUID, str);
}

function main(metadata, orientation) {
    return new WireGuardApplet(orientation);
}
