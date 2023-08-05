const GLib = imports.gi.GLib;
const Gettext = imports.gettext;
const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;
const Gio = imports.gi.Gio;
const Lang = imports.lang;

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
        this.netMonitor = null;
        this.netMonitorId = null;
        this.netInterfaces = null;
        this.wireGuardMonitor = null;
        this.wireGuardMonitorId = null;
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

    onNetChanged() {
        const interfaces = this.getNetInterfaces();
        if (!interfaces) {
            return;
        }
        if (!this.netInterfaces.length == interfaces.length && this.netInterfaces.filter(e => interfaces.includes(e)).length == this.netInterfaces.length) {
            this.netInterfaces = interfaces;
        }
    }

    onWireGuardChanged() {
        const interfaces = this.getWireGuardInterfaces();
        if (!interfaces) {
            return;
        }
        if (!this.wireGuardInterfaces.length == interfaces.length && this.wireGuardInterfaces.filter(e => interfaces.includes(e)).length == this.wireGuardInterfaces.length) {
            this.wireGuardInterfaces = interfaces;
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
        if (!this.netMonitor) {
            this.netMonitor = Gio.network_monitor_get_default();
            this.netMonitorId = this.netMonitor.connect('network-changed', () => this.onNetChanged());
        }
        if (!this.wireGuardMonitor) {
            let wg_config_path = Gio.file_new_for_path("/etc/wireguard");
            if (!wg_config_path.query_exists(null)) {
                return;
            }
            this.wireGuardMonitor = wg_config_path.monitor_directory(Gio.FileMonitorFlags.SEND_MOVED, null);
            this.wireGuardMonitorId = this.wireGuardMonitor.connect('changed', () => this.onWireGuardChanged());
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
        if (this.netMonitor) {
            this.netMonitor.disconnect(this.netMonitorId);
            this.netMonitor = null;
        }
        if (this.wireGuardMonitor) {
            this.wireGuardMonitor.disconnect(this.wireGuardMonitorId);
            this.wireGuardMonitor = null;
        }
    }

    on_applet_clicked() {
        if (this.menu) {
            this.menu.toggle();
        }
    }

    on_item_toggled(iface, object, enable) {
        object.setToggleState(!enable);
        try {
            const proc = Gio.Subprocess.new(
                ['pkexec', 'wg-quick', enable ? 'up' : 'down', iface],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_MERGE | GLib.SpawnFlags.SEARCH_PATH
            );
            let out, self = this;
            proc.get_stdout_pipe().read_bytes_async(1048576, 0, null, Lang.bind(proc, (o, result) => {
                out = o.read_bytes_finish(result).get_data().toString();
            }));
        } catch (e) {
        }
    }

}

function _(str) {
    return Gettext.dgettext(UUID, str);
}

function main(metadata, orientation) {
    return new WireGuardApplet(orientation);
}
