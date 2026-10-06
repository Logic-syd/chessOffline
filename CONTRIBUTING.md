# 轻量开发与发布流程

目标是让 `main` 始终保持可运行、可测试、可发布，同时不为个人离线工具增加不必要的管理负担。

## 采用什么分支模式

本项目采用轻量 GitHub Flow：**稳定的 `main` + 短期 `feature/*` / `fix/*` + 固定发布标签 `vX.Y.Z`**。不设置长期 `dev`、`test` 或 `release` 分支；测试环境不等于需要一个长期测试分支。

功能和行为变更通过小型 PR 合入 `main`，合入前完成检查。纯文档、错别字等低风险小改可以直接提交 `main`，仍需检查差异。`Checks` 工作流仅检查，不自动合并或创建标签；独立的 Pages 工作流在检查通过后组装站点。仓库权限与分支保护需由维护者另行管理。双发布路径见第 4 节。

选择流程的依据是发布节奏、是否并行维护旧版、变更风险与回滚成本，以及团队和测试成熟度，**不是代码量或项目大小**。

| 场景 | 可采用的流程 |
| --- | --- |
| 单人小工具、偶尔修改 | 稳定主分支；低风险文档直提，功能使用短期分支 |
| 本项目：按需更新、不长期维护多个版本 | 轻量 GitHub Flow，小 PR 检查后合入，再按需打标签 |
| 频繁发布、自动化测试与回滚能力成熟 | 主干开发，保持极短分支寿命，并依赖更强的持续集成 |
| 必须同时维护多个已发布版本 | 按实际支持周期设维护 / release 分支，将修复按需回补 |

这里参考 [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow) 的短期分支与 PR 协作方式，以及 [主干开发](https://trunkbaseddevelopment.com/) 对短周期集成的强调。[Gitflow 的说明](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow) 可帮助理解长期分支的额外协调成本；它不是“大项目”的默认答案。

## 1. 从最新 main 开始

先确认工作区没有尚未处理的改动。以下使用 `feature/offline-readiness` 作为新功能分支示例；修复问题使用 `fix/简短名称`。

```sh
git status
git switch main
git pull --ff-only origin main
git switch -c feature/offline-readiness
```

一个分支专注一件事，避免把功能、无关格式调整和部署改动混在一起。不强制推送，也不重写已共享的历史。

例外：若问题仅存在于尚未合入 `main` 的功能测试版，应从最新的该功能分支创建 `fix/*`，通过 PR 合回同一个功能分支，不把未完成的功能提前带入 `main`。例如本次从 `feature/i18n` 创建 `fix/german-layout-shift`，PR 的目标仍为 `feature/i18n`；保留修复分支上的测试、修复和版本提交记录。该功能整体通过测试后，再另行向 `main` 提交 PR。

## 2. 修改、检查并提交 PR

开发检查需要 Node.js 16.20 或以上；不需要安装 npm 依赖。CI 使用 Node.js 22。

```sh
node --check dist/app.js
node --check dist/sw.js
node scripts/version.mjs --check
node --test tests/*.test.mjs
```

涉及交互或缓存时，还应在浏览器验证：能正常走棋、悔棋和继续存档；完成缓存后，飞行模式重新打开仍能显示全部棋子并与电脑对弈。测试省电开关与应用切到后台再返回的行为。自动化检查不能替代真机离线测试，也不是续航测试。

涉及布局或多语言文案时，在仓库根目录运行 `python3 -m http.server 8848 --bind 127.0.0.1`，打开 `http://127.0.0.1:8848/tests/layout.html`，点击 **Run layout checks**。修改代码后需强制刷新页面，避免浏览器复用旧 CSS 或测试脚本。预期结果为 `passed: true`、`checked: 330`、`controlsChecked: 30`、`failing: 0`。此浏览器回归覆盖中英德三语、10 种屏宽（320/375/390/430/580/768/900/901/1024/1280px）、11 种回合/结果状态，检查棋盘、状态卡、走棋记录和操作区的位置及横向溢出；额外核验手机/桌面控件位置、触摸尺寸和唯一 ID。测试夹具使用真实页面、CSS、翻译和响应式控件函数，但不运行棋局或 Service Worker、不修改存档，也不会打包进 `dist/`；仍需手动走棋、悔棋、翻转、开新局以及调整屏宽做交互冒烟测试。CI 只校验此浏览器脚本语法，不会自动运行浏览器布局测试。

回归页还会检查三语安装说明在 320×568、390×844 和 1280×900 下的弹窗位置、横向溢出及关闭按钮，预期 `installChecked: 9`、`failing: 0`。此夹具不会触发真实安装，也不代表这些浏览器或设备均支持安装；安装入口仍以实际浏览器能力为准。

准备本次发布时，在功能分支上升级版本并补充日志；同一个待发布版本只升级一次，不必每个提交都加版本号。例如从 `1.0.0` 准备兼容的新功能版：

```sh
node scripts/version.mjs minor "增加离线检查与省电选项"
node scripts/version.mjs --check
node --test tests/*.test.mjs
```

升级脚本只更新文件，不会发布或打标签。`patch` 用于兼容修复，`minor` 用于兼容新功能，`major` 用于不兼容变更。多个 PR 共同组成一个版本时，可以在最后一个准备发布的 PR 中升级版本；修改离线资源后，正式部署前必须更新缓存版本。

检查改动后，只暂存本次涉及的文件。下面的路径是应用、测试和版本文件示例；文档、脚本或工作流若有改动，请单独加入，不要把私有配置或无关文件带入提交。

```sh
git diff
git add dist tests VERSION CHANGELOG.md
git diff --cached
git status
git commit -m "Add offline readiness checks"
git push -u origin feature/offline-readiness
```

在 GitHub 从该分支向 `main` 创建 PR，简述改动、检查结果及缓存 / 存档兼容性。等 `Checks` 成功，并检查页面与关键操作后，再由维护者合并。不启用自动合并或自动部署。

合并后先确认不再需要分支；如果该分支仍是 Pages 测试站发布源，先调整发布源或停用测试站。之后可通过 GitHub 的 **Delete branch** 删除远端功能分支，再更新本地 `main`：

```sh
git switch main
git pull --ff-only origin main
git branch -d feature/offline-readiness
```

若使用 squash 合并，`-d` 可能无法识别为已合并并拒绝删除。此时先保留本地分支，核对 PR 和提交内容后再处理；不要为了清理而直接强制删除。

## 3. 合并、验证后再打发布标签

`main` 上通过检查的提交不一定需要立即发布。准备发布时，确认 PR 已合并，工作区干净，本地 `main` 与远端一致，并复测合并后的代码。

```sh
git switch main
git pull --ff-only origin main
git status
node scripts/version.mjs --check
node --test tests/*.test.mjs
```

确认 `VERSION` 与日志是本次要发布的版本，且 GitHub 上合并后的 `Checks` 已通过，再创建对应标签。以下以 `1.1.0` 为例，仅在该版本完成合并与验证后执行：

```sh
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0
```

`1.1.0` 仅是上述命令的历史示例，实际发布时以 `VERSION` 为准；已有标签保持不变。版本号写入文件不代表已经发布，必须先完成 PR 合并与合并后验证，再打对应标签。

标签一经共享就不移动、不覆盖。发现问题时发布新的修复版本；需要回滚线上应用时，部署经过确认的旧标签内容，不改旧标签本身。

## 4. 网站部署是独立的一步

正式站点的发布与合并 PR、打标签分开。经维护者确认发布后，再把对应标签的完整 `dist/` 部署到 HTTPS 托管服务，并验证安装、离线重启、棋子加载和旧存档恢复。

Pages 使用 GitHub Actions 作为发布源。一个受控工作流从不可移动的 `v1.4.3` 标签提取 `dist/` 到正式路径 `/dist/`（根路径 `/` 跳转到这里），从 `feature/i18n` 提取 `dist/` 到测试路径 `/test/`。对应入口：[正式棋盘](https://logic-syd.github.io/chessOffline/) / [测试棋盘](https://logic-syd.github.io/chessOffline/test/)。两个路径的 Service Worker 和缓存作用域不同；打包脚本只对测试副本的棋局和设置存储键增加 `test` 命名空间，避免普通使用时覆盖正式棋局，源分支文件不改。它们同源，不构成安全隔离。旧 `/dist/` 链接和本地存档继续用于正式版。

`Checks` 对 `main` 或 `feature/i18n` 的推送成功后，发布工作流会重新组装并部署两个路径；检查失败不部署。正式来源始终是工作流固定的标签，测试分支的推送不能改变正式文件。新版本发布时，先走 PR、合并后检查、打新标签，再单独 PR 修改 `scripts/prepare-pages.mjs` 和 `.github/workflows/pages.yml` 中的固定标签，合并并验证正式地址；随后按需把同一版本包重新上传 itch.io。不要移动已有标签。测试分支作为测试站发布输入保留，但新功能仍从短期 `feature/*` 或 `fix/*` 开发并通过 PR；不要让测试分支成为不受审查的正式发布源。

发布后请在两个地址检查版本号、走棋、离线资源自检和飞行模式重启，并核对正式版旧存档仍可读取、测试版不覆盖正式棋局。`Checks` 仅有 `contents: read`；部署作业单独获得 `pages: write` 与 `id-token: write`，不需要长期 GitHub 密钥。
