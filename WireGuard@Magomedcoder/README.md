## WireGuard

```sh
git clone https://github.com/magomedcoder/cinnamon-applets

cd WireGuard@Magomedcoder
```

```sh
sudo chmod o+r /etc/wireguard 
# или
sudo setfacl -m u:username:rx /etc/wireguard
# Где username - ваше имя пользователя. 
```

### Установка расширения

```
    cp -ar . ~/.local/share/cinnamon/applets/WireGuard@Magomedcoder
```

```sh
# Если у вас не установлен resolvconf, то при активации нового конфига возникнет ошибка "resolvconf: command not found". 
# Чтобы избежать данной ошибки, установите пакет командой:
sudo apt install resolvconf
```
