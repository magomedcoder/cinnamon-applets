# WireGuard

## Установка

```bash
cp -ar WireGuard@Magomedcoder ~/.local/share/cinnamon/applets/
```

## Без пароля

```bash
sudo usermod -aG netdev $USER
# перелогиниться

sudo cp ~/.local/share/cinnamon/applets/WireGuard@Magomedcoder/wireguard-sudoers /etc/sudoers.d/wireguard-applet
sudo chmod 440 /etc/sudoers.d/wireguard-applet
```

## Доступ к /etc/wireguard

```bash
sudo setfacl -m u:$(whoami):rx /etc/wireguard
```

## Зависимости

```bash

```

## Перезагрузка апплета

```bash
dbus-send --session --dest=org.Cinnamon.LookingGlass --type=method_call /org/Cinnamon/LookingGlass org.Cinnamon.LookingGlass.ReloadExtension string:'WireGuard@Magomedcoder' string:'APPLET'
```

## Удаление

```bash
rm -rf ~/.local/share/cinnamon/applets/WireGuard@Magomedcoder
sudo rm -f /etc/sudoers.d/wireguard-applet
```
