# Kilimanjaro Chess · chessOffline

[English](#english) | [简体中文](#chinese) | [Deutsch](#deutsch)

<a id="english"></a>

## English

A lightweight, battery-conscious offline chess app built for hiking trips. Play against a local computer opponent and pick up where you left off—even when there’s no signal.

The idea was simple: on a hiking trip to Kilimanjaro, I wanted to play chess during breaks without relying on a network connection. So I built a small app that keeps both the board and the computer opponent on the phone.

The README and game interface support Simplified Chinese, English and German. The browser language selects the interface on first use; you can switch manually at any time. Your choice is saved on this device.

### Public test version

[Play the test version](https://logic-syd.github.io/chessOffline/dist/)

The public test site is published from `feature/i18n` at version `1.4.3`, with Chinese, English and German available in the language selector. It includes the turn-layout fix, browser-neutral installation help and compact mobile controls. On narrow screens, the language selector is at the top right and New game, Undo and Flip board sit below the board, before the compact status card. Desktop control placement is unchanged. The earlier `1.2.0` test version has been merged into `main`; the multilingual version remains on its feature branch for testing. Share the link with a friend and open it in their preferred browser. Installation and offline support vary by browser and device. Check the version in the page footer, then follow the offline preparation steps below. Existing users should reopen the app while online to receive the update. Saved games on this test site are separate from those on the older site hosted on a different domain.

GitHub Pages currently updates the test site after pushes to this test branch. Neither `main` nor release tags are automatically deployed by that configuration. Before deleting the test branch, change the Pages publishing source or disable the test site.

### Features

- **Offline play against the computer:** all chess calculations run on the device. Once the initial cache is complete, no network connection is needed to play.
- **Three computer difficulty settings:** Relaxed, Standard and Challenge. Standard keeps the current casual style; rating labels are not officially calibrated.
- **Battery-conscious design:** plain HTML, CSS and JavaScript, with no framework or third-party runtime dependencies. The computer calculates only on its turn, without continuous background analysis.
- **Power-saving mode:** enabled by default. It disables sound and vibration and reduces visual effects, while retaining last-move highlights and static game-result feedback. Pending computer turns pause when the page is hidden. Actual battery use depends on the device; no percentage saving is promised.
- **Automatic saves:** reopen the app in the same browser on the same device to continue an unfinished game.
- **A readable board:** solid pieces, an angular king design, highlighted move origins and destinations, and a move list.
- **Game controls:** choose White or Black, undo, flip the board or start a new game.
- **Rules and feedback:** supports castling, en passant, all four promotion choices, check and checkmate, plus draws by stalemate, repetition, the fifty-move rule and insufficient material. Results appear when a game ends.
- **Home-screen installation:** includes a PWA manifest and Service Worker for mobile and desktop browsers.
- **Chinese, English and German interface:** switch languages without starting a new game. All three languages and their installation metadata are available offline after setup. German move notation is displayed with local piece letters without changing saved games.

> The Standard setting targets a casual experience around 1000, not an officially calibrated rating. Battery efficiency is a design goal, not a measured battery-life claim; actual consumption depends on the device, screen brightness and session length.

### Before your trip: prepare for offline play

1. While online, open the app over **HTTPS** in your phone’s browser. Wait for the page, pieces and offline cache to load. Tap **Check offline files** (or **检查离线资源**) to verify readiness.
2. Tap **Install on phone** (or **安装到手机**). If the browser offers an installation prompt, follow it; otherwise look under **Share** or the browser menu for **Install app / Add to Home Screen**. Availability and steps vary by browser. If no installation option is available, you can continue in the browser, but verify offline readiness there instead of assuming it works. Open the app while online from the entry point you plan to use on your trip (browser or home-screen icon), then check readiness there too.
3. **Enable airplane mode and make sure Wi-Fi is off. Fully close and reopen the app, play a few moves and wait for the computer’s response.** Complete this test before heading out.

The first visit must download the resources. A home-screen icon does not prove caching has finished, so the disconnected restart test matters. Do not clear the site’s browser data while away; browsers may also evict cached resources when storage is low.

The offline check verifies the current version, the controlling Service Worker and all application cache paths, including all three languages. It does not continuously probe the network. A successful check describes the current state, not a guarantee that the browser will retain the cache forever. Missing resources, inaccessible storage or failed installation show a localized **Offline not ready** state instead of treating a network connection as proof of readiness.

### Run locally

This is a static project: no npm installation and no build step are required. With Python 3 installed, run:

```sh
git clone https://github.com/Logic-syd/chessOffline.git
cd chessOffline
# Select the multilingual work branch; omit this line to run main instead.
git switch feature/i18n
python3 -m http.server 8080 --bind 127.0.0.1 --directory dist
```

Open [http://localhost:8080](http://localhost:8080) on that computer.

Service Workers require a secure context such as HTTPS or `localhost`. Double-clicking `index.html`, or opening a plain HTTP LAN address on a phone, is not a reliable way to install the offline app. For phone use, deploy `dist/` to an HTTPS static host first.

### Static deployment

Publish the entire contents of `dist/`, retaining the `pieces/` subdirectory and its license files, and enable HTTPS. No backend, server-side database or API key is required.

When application assets change, use the version command below to update the offline cache version as well. Devices can receive updates when they next open the app online; offline devices continue using their cached version. Only the test branch described above currently has automatic publishing configured. Other branches and Git tags do not automatically update the website; a production deployment remains a separate decision.

### Simple version management

`VERSION` is the canonical version file, and [CHANGELOG.md](CHANGELOG.md) records changes. The footer displays the current version. The offline cache changes with the app version, while the existing saved-game storage key stays unchanged.

Versions use `major.minor.patch`: `patch` for compatible fixes (1.0.0 → 1.0.1), `minor` for compatible features (→ 1.1.0), and `major` for incompatible changes (→ 2.0.0). The first formal tag is `v1.0.0`; earlier internal cache identifiers are not release versions.

The maintenance scripts require Node.js 16.20 or later, with no package installation. Playing the game does not require Node.js. Run these commands from the repository root:

```sh
# Check agreement between VERSION, the page, the cache and the changelog.
node scripts/version.mjs --check

# Run all automated tests.
node --test tests/*.test.mjs

# After making changes, increment the version with a short summary.
node scripts/version.mjs patch "Fix a board display issue"
```

The upgrade command updates `VERSION`, the page’s version label, the Service Worker cache version and the changelog together. It does not commit, tag, push or access the network. Do not edit only `VERSION`, because the consistency check will then fail.

Development uses **stable `main` + short-lived `feature/*` / `fix/*` branches**. Behavior changes go through small PRs and tests; low-risk documentation changes may go directly to `main`. There are no permanent `dev`, `test` or `release` branches. Workflow choices depend on release cadence, risk, support for older versions and team capabilities—not code size.

Prepare the version on a feature branch, then **tag the corresponding `main` commit only after the PR has merged and post-merge checks pass**. The `Checks` CI workflow validates syntax, versions and tests; it does not merge or deploy. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow and examples (in Chinese).

Each `vX.Y.Z` tag identifies a fixed, traceable release. Never move or overwrite shared tags; `v1.0.0` stays unchanged. Use `git show v1.0.0:CHANGELOG.md` to inspect an older changelog, or download a tagged source archive from GitHub’s Tags page.

### Saved games and privacy

The game, move list, board orientation and side preference are stored in the browser’s `localStorage`. After a reload, up to the latest 30 half-moves of undo history are retained.

The app requires no account, does not upload games, and contains no advertising or analytics SDK. Saves do not sync between devices. Changing browsers or site domains, or clearing site data, can make previous saves unavailable. Use a regular browser session rather than private browsing.

### Project structure

```text
VERSION                    # Canonical version number
CHANGELOG.md               # Changes by version
CONTRIBUTING.md            # Branch, PR, testing and release workflow
.github/workflows/check.yml # Read-only CI checks; no deployment
scripts/version.mjs        # Dependency-free version checks and upgrades
tests/                     # Tests using Node's built-in tools
dist/
├── index.html             # Page structure
├── styles.css             # Board, responsive layout and game feedback
├── app.js                 # Chess rules, computer opponent, UI and saves
├── runtime.js             # Audio cleanup and pending-turn scheduling
├── offline.js             # Resource list, readiness checks and updates
├── i18n.js                # Three interface languages and language selection
├── sw.js                  # Offline asset caching
├── manifest.webmanifest   # PWA installation metadata
├── manifest.en.webmanifest # English installation metadata
├── manifest.de.webmanifest # German installation metadata
├── icon.svg               # Application icon
└── pieces/                # 12 piece SVGs and artwork license files
```

The opponent offers three settings using shallow search, position evaluation and controlled randomness to keep computation modest. Standard targets a casual experience around 1000, but none of the settings is an officially calibrated rating or a professional analysis engine.

### Piece artwork and licensing

Queen, rook, bishop, knight and pawn artwork is adapted from Colin M. L. Burnett (Cburnett). Sources and modifications are documented in [NOTICE.txt](dist/pieces/NOTICE.txt). The king uses a geometric design redrawn for this project.

These SVG pieces are licensed under **GPL-2.0-or-later**. See [COPYING.txt](dist/pieces/COPYING.txt) for the full license; the SVG files are their editable source. This statement applies to the piece artwork. The remaining application code does not yet have a separate open-source license.

---

<a id="chinese"></a>

## 简体中文

### 高山棋局 · chessOffline

为徒步旅途打造的轻量离线国际象棋应用，以低功耗为设计目标。

起因很简单：去乞力马扎罗徒步，没有网络，也想在山间休息时下盘棋。于是做了这个小应用，让棋盘和电脑对手都留在手机里。

README 和游戏界面支持简体中文、英语、德语。首次打开按浏览器语言选择，也可以随时在应用中手动切换，选择会保存在本机。

### 公开测试版

[打开测试版棋盘](https://logic-syd.github.io/chessOffline/dist/)

公开测试站从 `feature/i18n` 分支发布，页面版本为 `1.4.3`，可在语言选择器中切换中文、英语和德语。已包含回合布局抖动修复、不限定浏览器的安装引导及紧凑的手机操作区。窄屏下语言切换位于右上角，新对局、悔棋、翻转按钮紧接棋盘下方，后面是缩小的状态卡；桌面版控件位置不变。此前的 `1.2.0` 测试版已经合入 `main`；多语言版本仍保留在功能分支供测试。可以直接把链接发给朋友，用她常用的浏览器打开；安装与离线支持因浏览器和设备而异。先确认页面底部版本，再按下方步骤检查离线使用。使用过旧版的用户请先联网重新打开应用，以接收更新。测试站的棋局与其他域名上的旧站独立保存。

GitHub Pages 目前会在这个测试分支推送后更新测试站；`main` 和发布标签不会因此自动部署。测试结束后，删除该分支前应先调整 Pages 发布源或停用测试站。

### 功能

- **离线人机对弈**：电脑计算在本机完成，完成首次缓存后，无需网络即可游玩。
- **三档电脑棋力**：轻松、标准、挑战；标准档保留当前休闲体验。等级分只是体验目标，未经过正式校准。
- **省电设计**：原生 HTML、CSS 和 JavaScript，无框架、无运行时依赖；电脑只在自己的回合计算，不持续进行后台棋局分析。
- **省电模式**：默认开启，关闭声音与震动、减少视觉动效，保留走棋高亮及静态胜负提示。切到后台会暂停待执行的电脑回合；以实际设备体验为准，不承诺节电比例。
- **自动保存**：在同一设备、同一浏览器中重新打开，可继续未完成的对局。
- **清晰棋盘**：实心棋子、硬朗的国王造型、上一手起点与终点高亮，以及文字走棋记录。
- **对局操作**：选择执白或执黑、悔棋、翻转棋盘、开始新局。
- **规则与反馈**：支持王车易位、吃过路兵、四种升变选择、将军和将死，以及逼和、重复局面、五十回合和子力不足判和；对局结束时显示胜负或和棋反馈。
- **可安装到主屏幕**：提供 PWA 清单与 Service Worker，适配手机和桌面浏览器。
- **中英德三语界面**：切换语言不会重开棋局；三种语言和安装信息会在准备完成后一起离线缓存。德语走棋记录显示德语棋子缩写，不改动原有存档。

> 标准档以约 1000 分的休闲体验为目标，未经过正式等级分校准。省电是设计取向，尚无标准化续航测试；实际耗电取决于设备、屏幕亮度与使用时间。

### 出发前：准备离线使用

1. 在有网络时，用手机浏览器打开已通过 **HTTPS** 部署的应用，等待页面和所有棋子加载完成、离线缓存建立，并使用应用中的离线资源检查确认准备状态。
2. 点击应用中的“安装到手机”。如果浏览器提供安装弹窗，按提示操作；否则在“分享”或浏览器菜单中查找“安装应用 / 添加到主屏幕”。入口与支持情况因浏览器而异。没有安装选项时可以继续在浏览器中游玩，但需在那里验证离线就绪，不能默认可离线。出发前，请在实际准备使用的入口（浏览器或主屏幕图标）联网打开，再检查一次离线就绪状态。
3. **开启飞行模式，并确认 Wi-Fi 已关闭；彻底关闭应用后重新打开，实际走几步并等待电脑回应。** 确认这一步成功，再带它出发。

首次访问需要下载资源。安装图标本身不等于缓存一定完成，因此出发前的断网测试很重要。离线期间不要清除该站点的浏览器数据；浏览器也可能因存储空间不足而回收缓存。

“检查离线资源”会核验当前版本、控制页面的 Service Worker，以及本应用全部缓存路径（含三种语言）；不会通过持续联网探测来判断就绪。检查结果只代表当前状态，无法保证浏览器今后不会清理缓存。缺失资源、存储不可用或离线安装失败时，会显示对应语言的“离线未就绪”，而不是仅凭有网络就提示可离线。

### 本地运行

这是一个纯静态项目，不需要安装 npm 依赖，也没有构建步骤。安装 Python 3 后运行：

```sh
git clone https://github.com/Logic-syd/chessOffline.git
cd chessOffline
# 运行多语言开发分支；如需运行 main，可省略下一行。
git switch feature/i18n
python3 -m http.server 8080 --bind 127.0.0.1 --directory dist
```

在这台电脑上打开 [http://localhost:8080](http://localhost:8080)。

Service Worker 需要 HTTPS 或 `localhost` 等安全上下文。直接双击 `index.html`，或让手机访问普通的局域网 HTTP 地址，不能可靠地完成离线安装。手机使用应先将 `dist/` 部署到支持 HTTPS 的静态网站托管服务。

### 静态部署

将 `dist/` 的全部内容作为网站发布目录，保留 `pieces/` 子目录及其中的许可文件，并启用 HTTPS。无需后端、数据库或 API 密钥。

更新应用资源时，请通过下面的版本命令同步更新离线缓存版本。设备再次联网打开应用后，才有机会获取新版本；已经离线的设备会继续使用缓存版本。当前只有上方指定的测试分支已配置自动发布；其他分支或 Git 标签不会自动更新网站，正式发布仍需单独确认部署。

### 简单版本管理

`VERSION` 是版本号的唯一维护入口，历史变更记录在 [CHANGELOG.md](CHANGELOG.md)。页面底部会显示当前版本；离线缓存随版本更新，已有棋局的存储标识保持不变。

采用 `主版本.次版本.修订号`：修复问题用 `patch`（如 1.0.0 → 1.0.1），兼容的新功能用 `minor`（→ 1.1.0），不兼容变更用 `major`（→ 2.0.0）。首个正式标签为 `v1.0.0`，早期内部缓存编号不作为发布版本。

维护版本需要 Node.js 16.20 或以上，无需安装依赖；运行棋局本身不需要 Node.js。在仓库根目录运行：

```sh
# 检查版本号、页面、离线缓存与日志是否一致
node scripts/version.mjs --check

# 跑全部自动化测试
node --test tests/*.test.mjs

# 完成修改后，升级版本并填写本次更新说明
node scripts/version.mjs patch "修复棋盘显示问题"
```

升级命令会一起更新 `VERSION`、页面版本显示、Service Worker 缓存版本和更新日志，不会自动提交、打标签或联网。不要只修改 `VERSION`，否则一致性检查会失败。

开发采用**稳定 `main` + 短期 `feature/*` / `fix/*` 分支**：功能改动通过小型 PR 和测试合入；低风险的文档小改可直接提交 `main`。不设置长期 `dev`、`test`、`release` 分支。流程取决于发布节奏、风险、旧版维护需求与团队能力，不取决于代码大小。

版本在功能分支上准备，**PR 合并且合并后验证通过，才在 `main` 的对应提交打标签**。CI 检查语法、版本一致性和测试，不自动合并或部署。完整命令与适用场景见 [CONTRIBUTING.md](CONTRIBUTING.md)。

每个 `vX.Y.Z` 标签固定一个可追溯版本，不移动或覆盖已有标签；`v1.0.0` 保持不变。想查看旧版本时可用 `git show v1.0.0:CHANGELOG.md`，也可在 GitHub 的 Tags 页面下载对应源码。

### 存档与隐私

棋局、走棋记录、棋盘方向和阵营选择保存在浏览器的 `localStorage` 中，刷新后最多保留最近 30 个半回合的悔棋状态。

应用本身不需要注册账号，不上传棋局，也没有广告或分析 SDK。存档不会在设备间同步；更换浏览器、切换网站域名或清除站点数据，都可能使原存档不可用。建议使用普通浏览模式，而不是无痕模式。

### 项目结构

```text
VERSION                   # 唯一维护的版本号
CHANGELOG.md              # 逐版本更新记录
CONTRIBUTING.md           # 分支、PR、检查与发布流程
.github/workflows/check.yml # 只读 CI 检查，不部署
scripts/version.mjs       # 检查与升级版本（无第三方依赖）
tests/                    # 零第三方依赖的自动化测试
dist/
├── index.html             # 页面结构
├── styles.css             # 棋盘、移动端布局与对局反馈
├── app.js                 # 棋局规则、电脑对手、交互与存档
├── runtime.js             # 音频资源回收与后台回合暂停
├── offline.js             # 离线资源清单、就绪自检与更新管理
├── i18n.js                # 中英德界面翻译与语言选择
├── sw.js                  # 离线资源缓存
├── manifest.webmanifest   # PWA 安装信息
├── manifest.en.webmanifest # 英语安装信息
├── manifest.de.webmanifest # 德语安装信息
├── icon.svg               # 应用图标
└── pieces/                # 12 个棋子 SVG 与素材许可
```

电脑按三档使用浅层搜索、局面评估和不同程度的随机选择，以控制计算量。标准档以约 1000 分的休闲体验为目标，但并非正式定级或专业棋力分析引擎。

### 棋子素材与许可

后、车、象、马、兵的图形改编自 Colin M. L. Burnett（Cburnett）的棋子素材，来源与修改说明见 [NOTICE.txt](dist/pieces/NOTICE.txt)。国王使用为本项目重新绘制的几何造型。

这些 SVG 棋子采用 **GPL-2.0-or-later**，完整许可见 [COPYING.txt](dist/pieces/COPYING.txt)，仓库内 SVG 即可编辑源码。该声明针对棋子素材；应用其余代码尚未指定独立的开源许可证。

---

<a id="deutsch"></a>

## Deutsch

Bergschach ist eine kleine Schach-App für Wanderungen und Reisen ohne Netzempfang. Der Computergegner läuft direkt auf dem Gerät; nach der ersten Einrichtung kannst du ohne Internet spielen. Die Oberfläche gibt es auf Deutsch, Englisch und vereinfachtem Chinesisch.

Die App verwendet HTML, CSS und JavaScript ohne Laufzeitbibliotheken. Ein Energiesparmodus reduziert Ton, Vibration und Animationen. Vor der Tour prüft die App, ob alle benötigten Dateien offline gespeichert sind. Spielstand und Sprache bleiben auf dem Gerät.

Zum Offline-Test: Öffne die App zunächst mit Internet über HTTPS, installiere sie bei Bedarf auf dem Startbildschirm und nutze „Offline-Dateien prüfen“. Aktiviere danach den Flugmodus, schließe die App vollständig und öffne sie erneut. Spiele einige Züge gegen den Computer, bevor du ohne Netz aufbrichst.
