# 轻量开发与发布流程

目标是让 `main` 始终保持可运行、可测试、可发布，同时不为个人离线工具增加不必要的管理负担。

## 采用什么分支模式

本项目采用轻量 GitHub Flow：**稳定的 `main` + 短期 `feature/*` / `fix/*` + 固定发布标签 `vX.Y.Z`**。不设置长期 `dev`、`test` 或 `release` 分支；测试环境不等于需要一个长期测试分支。

功能和行为变更通过小型 PR 合入 `main`，合入前完成检查。纯文档、错别字等低风险小改可以直接提交 `main`，仍需检查差异。CI 仅检查，不自动合并、发布网站或创建标签；仓库权限与分支保护需由维护者另行管理。

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

## 2. 修改、检查并提交 PR

开发检查需要 Node.js 16.20 或以上；不需要安装 npm 依赖。CI 使用 Node.js 22。

```sh
node --check dist/app.js
node --check dist/sw.js
node scripts/version.mjs --check
node --test tests/*.test.mjs
```

涉及交互或缓存时，还应在浏览器验证：能正常走棋、悔棋和继续存档；完成缓存后，飞行模式重新打开仍能显示全部棋子并与电脑对弈。测试省电开关与应用切到后台再返回的行为。自动化检查不能替代真机离线测试，也不是续航测试。

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

合并后先确认不再需要分支；可通过 GitHub 的 **Delete branch** 删除远端功能分支，然后更新本地 `main`：

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

`v1.0.0` 保持不变；当前省电功能分支预备的是 `1.1.0`，在完成上述流程前不应创建 `v1.1.0` 标签。版本号写入文件不代表已经发布。

标签一经共享就不移动、不覆盖。发现问题时发布新的修复版本；需要回滚线上应用时，部署经过确认的旧标签内容，不改旧标签本身。

## 4. 网站部署是独立的一步

推送源码、合并 PR 和打标签都不会自动更新网站。经维护者确认发布后，再把对应标签的完整 `dist/` 部署到 HTTPS 托管服务，并验证安装、离线重启、棋子加载和旧存档恢复。

GitHub Actions 工作流只有 `contents: read` 权限，不使用项目密钥、不安装第三方 npm 包，也不执行部署。检查失败时先修复再合并，不通过跳过检查完成发布。
