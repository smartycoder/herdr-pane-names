# herdr-pane-names

Pane names for the [Herdr](https://herdr.dev) desktop app: name a terminal pane, see the name in its header,
and find it in Go To.

![Pane names](preview.png)

## Install

Ask the agent in your Herdr window to add `herdr.dev/mods/smartycoder/herdr-pane-names`, or by hand:

1. Copy `mods/pane-rename`, `mods/pane-named` and `mods/picker-named` to `~/.config/herdr-app/mods/`.
2. Merge `keys.json` into `~/.config/herdr-app/keys.json` (`cmd-k` Go To, `cmd-f2` rename).
3. To show names in pane headers, set `pane.header.content.mod` to `"pane-named"` in your layout (clone
   Herdr's own layouts first: `herdr-app do layout.clone '{"name":"main","as":"my-main"}'`).
4. `herdr-app check ~/.config/herdr-app/mods/<name>` for each mod.

How it works and how to rebuild it: [RECIPE.md](RECIPE.md).

## License

Apache License 2.0. `pane-named` and `picker-named` are modified from mods shipped with Herdr; see
[NOTICE](NOTICE).
