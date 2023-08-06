const GLib = imports.gi.GLib;
const Gettext = imports.gettext;
const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const ModalDialog = imports.ui.modalDialog;

const UUID = "WireGuard@Magomedcoder";

Gettext.bindtextdomain(UUID, `${GLib.get_home_dir()}/.local/share/locale`);

class WireGuardApplet extends Applet.IconApplet {

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
            this.handleError(_("Ошибка при чтении сетевых интерфейсов"), e);
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
            this.handleError(_("Ошибка доступа к директории конфигураций WireGuard, убедитесь, что она доступна\n sudo chmod o+r /etc/wireguard или sudo setfacl -m u:username:rx /etc/wireguard"), e);
            return [];
        }
    }

    refreshMenu() {
        if (!this.menu) {
            return;
        }
        this.menu.removeAll();
        let active = 0;
        for (let i = 0; i < this.wireGuardInterfaces.length; i++) {
            const iface = this.wireGuardInterfaces[i];
            const enabled = this.netInterfaces.includes(iface);
            if (enabled) {
                active++;
            }
            const item = new PopupMenu.PopupSwitchMenuItem(iface, enabled);
            item.connect('toggled', (object, value) => this.on_item_toggled(iface, object, value));
            this.menu.addMenuItem(item);
        }
        this.set_applet_icon_name(active > 0 ? "status-on" : "status-off");
        this.set_applet_tooltip(_("WireGuard"));
    }

    onNetInterfacesChanged() {
        const interfaces = this.getNetInterfaces();
        if (!interfaces) return
        if (JSON.stringify(this.netInterfaces) !== JSON.stringify(interfaces)) {
            this.netInterfaces = interfaces;
            this.refreshMenu();
        }
    }

    onWireGuardInterfacesChanged() {
        const interfaces = this.getWireGuardInterfaces();
        if (!interfaces) return
        if (JSON.stringify(this.wireGuardInterfaces) !== JSON.stringify(interfaces)) {
            this.wireGuardInterfaces = interfaces;
            this.refreshMenu();
        }
    }

    handleError(msg, details = null, fatal = true) {
        let formatted = msg;
        if (details) {
            formatted += "\n\n" + _("Детали ошибки") + ":\n" + details;
        }
        global.logError(formatted);
        new ModalDialog.NotifyDialog(formatted).open();
        if (fatal) {
            this.on_applet_removed_from_panel();
            this.set_applet_tooltip(msg);
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
            this.netMonitorId = this.netMonitor.connect('network-changed', () => this.onNetInterfacesChanged());
        }
        if (!this.wireGuardMonitor) {
            let wg_config_path = Gio.file_new_for_path("/etc/wireguard");
            if (!wg_config_path.query_exists(null)) {
                this.handleError(_("Директория конфигураций WireGuard /etc/wireguard не существует, убедитесь, что WireGuard установлен"));
                return;
            }
            this.wireGuardMonitor = wg_config_path.monitor_directory(Gio.FileMonitorFlags.SEND_MOVED, null);
            this.wireGuardMonitorId = this.wireGuardMonitor.connect('changed', () => this.onWireGuardInterfacesChanged());
        }
        this.refreshMenu();
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
            proc.wait_async(null, Lang.bind(proc, () => {
                if (proc.get_exit_status()) {
                    self.handleError(_("Ошибка переключения интерфейса WireGuard"), out, false);
                }
            }));
        } catch (e) {
            this.handleError(_("Ошибка вызова wg-quick, убедитесь, что он установлен и доступен"), e, false);
        }
    }

}

function _(str) {
    return Gettext.dgettext(UUID, str);
}

function main(metadata, orientation) {
    return new WireGuardApplet(orientation);
}
