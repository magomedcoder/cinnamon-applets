## Апплеты для рабочего стола Cinnamon

## Апплеты

- [WireGuard](https://github.com/magomedcoder/cinnamon-applets/blob/main/WireGuard@Magomedcoder)
- [Redshift](https://github.com/magomedcoder/cinnamon-applets/blob/main/Redshift@Magomedcoder)

---

### Просмотр логов (опционально)

``` sh
tail -1000f ~/.xsession-errors | grep --line-buffered -v '^Cinnamon warning'
```

### Перезагрузка апплета (опционально)

```sh
dbus-send --session --dest=org.Cinnamon.LookingGlass \
  --type=method_call /org/Cinnamon/LookingGlass org.Cinnamon.LookingGlass.ReloadExtension \
  string:'тут пакет, например WireGuard@Magomedcoder' string:'APPLET'
```

### Удаления апплета

```sh
rm -rf ~/.local/share/cinnamon/applets/тут пакет, например WireGuard@Magomedcoder
```
