# macOS 安装与安全提示 / Installation and safety

北页的 macOS 社区版本采用临时（ad-hoc）签名，未经 Apple Developer ID 签名或 Apple 公证。因此，首次打开时 macOS 可能提示无法验证开发者或阻止应用运行。这是发布方式带来的系统提示，不代表 Apple 已检查或认可这份应用。

## 下载正确的版本

| 你的 Mac | 文件 |
| --- | --- |
| M1、M2、M3、M4 等 Apple 芯片 | `BeiyeMD-1.1.2-mac-arm64.dmg` |
| Intel 芯片 | `BeiyeMD-1.1.2-mac-x64.dmg` |

不确定芯片类型时，点击屏幕左上角的 Apple 菜单，选择“关于本机”，查看“芯片”或“处理器”。只从 [BeiyeMD 官方 GitHub Releases](https://github.com/chenzhiyong1994/BeiyeMD/releases/latest) 下载。

## 安装与首次打开

1. 打开下载的 DMG，把 `BeiyeMD` 拖到“应用程序”文件夹。
2. 在“应用程序”中打开 BeiyeMD。如果系统阻止打开，请先关闭提示。
3. 打开“系统设置”→“隐私与安全性”，向下找到刚被阻止的 BeiyeMD。
4. 只有在确认下载来源和校验值后，点击“仍要打开”，再按系统提示确认。

“仍要打开”会绕过 macOS 的一项安全检查。若文件并非来自上面的官方地址，或校验值不一致，请删除文件，不要继续。

## 核对 SHA-256

在 Release 页面同时下载 `SHA256SUMS.txt`，打开“终端”并进入下载目录：

```bash
shasum -a 256 BeiyeMD-1.1.2-mac-arm64.dmg
# Intel 版本则将文件名改为 BeiyeMD-1.1.2-mac-x64.dmg
```

输出的长串字符应与 `SHA256SUMS.txt` 中同名文件完全一致。

---

## English

The macOS community build has an ad-hoc signature. It is not signed with an Apple Developer ID and is not notarized by Apple, so macOS may block the first launch. This warning is a consequence of the distribution method; Apple has not reviewed or endorsed the app.

Choose `arm64` for Apple silicon Macs (M1, M2, M3, M4, and later) or `x64` for Intel Macs. Download only from the [official BeiyeMD GitHub Releases page](https://github.com/chenzhiyong1994/BeiyeMD/releases/latest), then compare the DMG against `SHA256SUMS.txt`.

To install, open the DMG and drag BeiyeMD to Applications. Try opening it once. If macOS blocks it, close the warning, open **System Settings → Privacy & Security**, find the blocked BeiyeMD entry, and choose **Open Anyway**. Only override the warning when the file came from the official release page and its checksum matches.
