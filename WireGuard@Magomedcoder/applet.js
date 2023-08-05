const GLib = imports.gi.GLib;
const Gettext = imports.gettext;
const Applet = imports.ui.applet;

const UUID = "WireGuard@Magomedcoder";

Gettext.bindtextdomain(UUID, GLib.get_home_dir() + "./local/share/locale");

const WireGuardApplet = class WireGuardApplet extends Applet.IconApplet {

    constructor(orientation, panel_height, instance_id) {
        super(orientation, panel_height, instance_id);
        this.set_applet_icon_name("status-off");
        this.set_applet_tooltip(_("WireGuard"));
    }

    on_applet_added_to_panel(userEnabled) {
        console.log(userEnabled)
    }

    on_applet_removed_from_panel(deleteConfig) {
        console.log(deleteConfig)
    }

    on_applet_clicked(event) {
        console.log(event)
    }

    on_item_toggled(iface, object, enable) {
        console.log(iface)
        console.log(object)
        console.log(enable)
    }

}

function _(str) {
    return Gettext.dgettext(UUID, str);
}

function main(metadata, orientation) {
    new WireGuardApplet(orientation);
}
