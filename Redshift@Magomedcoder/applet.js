const Lang = imports.lang;
const Applet = imports.ui.applet;
const GLib = imports.gi.GLib;
const Gettext = imports.gettext.domain('cinnamon-applets');
const _ = Gettext.gettext;
const St = imports.gi.St;
const PopupMenu = imports.ui.popupMenu;

let icon_path = "/usr/share/cinnamon/theme/";

function TextImageMenuItem() {
    this._init.apply(this, arguments);
}

// redshift -b 0.5

TextImageMenuItem.prototype = {
    __proto__: PopupMenu.PopupBaseMenuItem.prototype,

    _init(text, icon, image, align, style) {
        PopupMenu.PopupBaseMenuItem.prototype._init.call(this);

        this.actor = new St.BoxLayout({style_class: style});
        this.actor.add_style_pseudo_class('active');
        if (icon) {
            this.icon = new St.Icon({icon_name: icon});
        }
        if (image) {
            this.icon = new St.Bin();
            this.icon.set_child(this._getIconImage(image));
        }
        this.text = new St.Label({text: text});
        if (align === "left") {
            this.actor.add_actor(this.icon, {span: 0});
            this.actor.add_actor(this.text, {span: -1});
        } else {
            this.actor.add_actor(this.text, {span: 0});
            this.actor.add_actor(this.icon, {span: -1});
        }
    },

    setText(text) {
        this.text.text = text;
    },

    setIcon(icon) {
        this.icon.icon_name = icon;
    },

    setImage(image) {
        this.icon.set_child(this._getIconImage(image));
    },

    _getIconImage(icon_name) {
        let icon_file = icon_path + icon_name + ".svg";
        let file = Gio.file_new_for_path(icon_file);
        let icon_uri = file.get_uri();

        return St.TextureCache.get_default().load_uri_async(icon_uri, 16, 16);
    },
}

function Redshift(orientation) {
    this._init(orientation);
}

Redshift.prototype = {
    __proto__: Applet.IconApplet.prototype,

    _init(orientation) {
        Applet.IconApplet.prototype._init.call(this, orientation);

        try {
            this.set_applet_icon_symbolic_name('display-brightness-symbolic');
            this.set_applet_tooltip(_("Adjust brightness"));

            this.menu = new Applet.AppletPopupMenu(this, orientation);
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menuManager.addMenu(this.menu);

            this._brightnessTitle = new TextImageMenuItem(
                _("Brightness"),
                "display-brightness-symbolic",
                false,
                "right",
                "sound-volume-menu-item"
            );

            this._brightnessSlider = new PopupMenu.PopupSliderMenuItem(10);
            this._brightnessSlider.connect('value-changed', Lang.bind(this, this._sliderChanged));

            this.menu.addMenuItem(this._brightnessTitle);
            this.menu.addMenuItem(this._brightnessSlider);


        } catch (e) {
            global.logError(e);
        }
    },

    on_applet_clicked(e) {
        this.menu.toggle();
    },

    _sliderChanged(slider, val) {
        GLib.spawn_command_line_async("redshift -o -b " + val);
    }
};

function main(metadata, orientation) {
    return new Redshift(orientation);
}
