const GLib = imports.gi.GLib;
const Gettext = imports.gettext;

const UUID = "WireGuard@Magomedcoder";

Gettext.bindtextdomain(UUID, GLib.get_home_dir() + "./local/share/locale");

function _(str: string): string {
    return Gettext.dgettext(UUID, str);
}

function main(metadata: any, orientation: any) {
    console.log(metadata)
    console.log(orientation)
}


