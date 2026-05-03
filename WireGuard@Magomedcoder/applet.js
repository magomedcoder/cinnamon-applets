const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const St = imports.gi.St;
const Gettext = imports.gettext;
const Lang = imports.lang;
const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;
const ModalDialog = imports.ui.modalDialog;
const ByteArray = imports.byteArray;

const UUID = "WireGuard@Magomedcoder";

Gettext.bindtextdomain(UUID, `${GLib.get_home_dir()}/.local/share/locale`);

function _(str) {
    return Gettext.dgettext(UUID, str);
}

function WireGuardMenuItem(ifaceName, enabled) {
    this._init(ifaceName, enabled);
}

WireGuardMenuItem.prototype = {
    __proto__: PopupMenu.PopupSwitchMenuItem.prototype,

    _init(ifaceName, enabled) {
        PopupMenu.PopupSwitchMenuItem.prototype._init.call(this, ifaceName, enabled);

        const box = this.actor.get_first_child();
        if (!box || !box.get_children().length) return;

        const icon = new St.Icon({
            icon_name: "network-vpn-symbolic",
            style_class: "wireguard-menu-icon",
            icon_size: 18
        });
        box.insert_child_at_index(icon, 0);
        box.set_style("spacing: 8px;");
    }
};

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
        this.netInterfaces = [];
        this.wireGuardMonitor = null;
        this.wireGuardMonitorId = null;
        this.wireGuardInterfaces = [];
    }

    getNetInterfaces() {
        try {
            const interfaces = [];
            const dir = Gio.file_new_for_path("/sys/class/net");
            const enumerator = dir.enumerate_children("standard::name", Gio.FileQueryInfoFlags.NONE, null);
            let file;
            while ((file = enumerator.next_file(null)) !== null) {
                interfaces.push(file.get_name());
            }
            return interfaces;
        } catch (e) {
            this._logError(_("Ошибка при чтении сетевых интерфейсов"), e);
            return [];
        }
    }

    getWireGuardInterfaces() {
        try {
            const interfaces = [];
            const dir = Gio.file_new_for_path("/etc/wireguard");
            if (!dir.query_exists(null)) {
                return [];
            }
            const enumerator = dir.enumerate_children("standard::name,standard::type", Gio.FileQueryInfoFlags.NONE, null);
            let file;
            while ((file = enumerator.next_file(null)) !== null) {
                if (file.get_file_type() === Gio.FileType.REGULAR && file.get_name().endsWith(".conf")) {
                    interfaces.push(file.get_name().slice(0, -5));
                }
            }
            return interfaces;
        } catch (e) {
            this._logError(_("Нет доступа к /etc/wireguard. Выполните:\nsudo setfacl -m u:$(whoami):rx /etc/wireguard"), e);
            return [];
        }
    }

    _buildMenu() {
        if (!this.menu) return;

        this.menu.removeAll();

        const header = new PopupMenu.PopupMenuItem(_("WireGuard"), { reactive: false });
        header.actor.add_style_class_name("wireguard-header");
        const headerIcon = new St.Icon({
            icon_name: "network-vpn-symbolic",
            style_class: "wireguard-header-icon",
            icon_size: 22
        });
        header.actor.insert_child_at_index(headerIcon, 0);
        header.actor.set_style("spacing: 10px; padding: 8px 12px;");
        this.menu.addMenuItem(header);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        let activeCount = 0;
        const netSet = new Set(this.netInterfaces);

        if (this.wireGuardInterfaces.length === 0) {
            const empty = new PopupMenu.PopupMenuItem(_("Нет конфигураций в /etc/wireguard"), { reactive: false });
            empty.actor.add_style_class_name("wireguard-empty");
            empty.actor.set_style("padding: 12px 16px; color: rgba(128,128,128,0.9);");
            this.menu.addMenuItem(empty);
        } else {
            for (const iface of this.wireGuardInterfaces) {
                const enabled = netSet.has(iface);
                if (enabled) activeCount++;
                const item = new WireGuardMenuItem(iface, enabled);
                item.connect("toggled", (obj, value) => this._onInterfaceToggled(iface, obj, value));
                this.menu.addMenuItem(item);
            }
        }

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._updatePanelIcon(activeCount);
        this.set_applet_tooltip(activeCount > 0 ? _("WireGuard") + " (" + activeCount + " " + _("активен") + ")" : _("WireGuard"));
    }

    _updatePanelIcon(activeCount) {
        if (activeCount > 0) {
            this.set_applet_icon_name("status-on");
            this.actor.add_style_class_name("wireguard-active");
            this.actor.remove_style_class_name("wireguard-inactive");
        } else {
            this.set_applet_icon_name("status-off");
            this.actor.add_style_class_name("wireguard-inactive");
            this.actor.remove_style_class_name("wireguard-active");
        }
    }

    _onNetInterfacesChanged() {
        const interfaces = this.getNetInterfaces();
        if (JSON.stringify(this.netInterfaces) !== JSON.stringify(interfaces)) {
            this.netInterfaces = interfaces;
            this._buildMenu();
        }
    }

    _onWireGuardInterfacesChanged() {
        const interfaces = this.getWireGuardInterfaces();
        if (JSON.stringify(this.wireGuardInterfaces) !== JSON.stringify(interfaces)) {
            this.wireGuardInterfaces = interfaces;
            this._buildMenu();
        }
    }

    _logError(msg, details) {
        const text = details ? `${msg}\n\n${_("Детали")}: ${details}` : msg;
        global.logError(text);
    }

    _showError(msg, details, fatal) {
        const text = details ? `${msg}\n\n${_("Детали")}:\n${details}` : msg;
        global.logError(text);
        new ModalDialog.NotifyDialog(text).open();
        if (fatal) {
            this.set_applet_tooltip(msg);
        }
    }

    _onInterfaceToggled(iface, menuItem, enable) {
        menuItem.setToggleState(!enable);

        try {
            const argv = ["sudo", "/usr/bin/wg-quick", enable ? "up" : "down", iface];
            const flags = Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_MERGE | GLib.SpawnFlags.SEARCH_PATH;
            const proc = Gio.Subprocess.new(argv, flags);

            const self = this;
            const pipe = proc.get_stdout_pipe();
            pipe.read_bytes_async(4096, GLib.PRIORITY_DEFAULT, null, function(stream, res) {
                let out = "";
                try {
                    const bytes = stream.read_bytes_finish(res);
                    if (bytes) out = ByteArray.toString(bytes.get_data());
                } catch (_e) {}
                proc.wait_async(null, function(proc, res) {
                    proc.wait_finish(res);
                    if (proc.get_exit_status() !== 0) {
                        var hint = (out && (out.indexOf("Not authorized") !== -1 || out.indexOf("not allowed") !== -1))
                            ? _("Добавьте себя в группу netdev и установите wireguard-sudoers (см. README).")
                            : out;
                        self._showError(_("Ошибка переключения WireGuard"), hint || null, false);
                    }
                    self._onNetInterfacesChanged();
                });
            });
        } catch (e) {
            this._showError(_("Не удалось выполнить wg-quick. Установите wireguard-tools и настройте полкит без пароля."), String(e), false);
        }
    }

    on_applet_added_to_panel() {
        if (!this.menuManager) {
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menu = new Applet.AppletPopupMenu(this, this.orientation);
            this.menuManager.addMenu(this.menu);
        }

        this.netInterfaces = this.getNetInterfaces();
        this.wireGuardInterfaces = this.getWireGuardInterfaces();

        const wgDir = Gio.file_new_for_path("/etc/wireguard");
        if (!wgDir.query_exists(null)) {
            this._showError(_("Папка /etc/wireguard не найдена. Установите WireGuard."), null, true);
            return;
        }

        if (!this.netMonitor) {
            this.netMonitor = Gio.network_monitor_get_default();
            this.netMonitorId = this.netMonitor.connect("network-changed", () => this._onNetInterfacesChanged());
        }
        if (!this.wireGuardMonitor) {
            this.wireGuardMonitor = wgDir.monitor_directory(Gio.FileMonitorFlags.SEND_MOVED, null);
            this.wireGuardMonitorId = this.wireGuardMonitor.connect("changed", () => this._onWireGuardInterfacesChanged());
        }

        this._buildMenu();
    }

    on_applet_removed_from_panel() {
        if (this.menuManager) {
            this.menuManager.removeMenu(this.menu);
            this.menu = null;
            this.menuManager = null;
        }
        this.netInterfaces = [];
        this.wireGuardInterfaces = [];
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
        if (this.menu) this.menu.toggle();
    }
}

function main(metadata, orientation, panel_height, instance_id) {
    return new WireGuardApplet(orientation, panel_height, instance_id);
}
