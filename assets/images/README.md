# README 图片资源说明

本目录存放 README.md 中使用的图片资源。

## 当前图片说明

- `欢迎页面.png` - Shellify 主界面截图
- `图1.jpg` - Shellify 终端界面截图
- `图2.png` - Shellify 系统监控界面截图

## 图片命名建议

为了更好的可维护性和国际化，建议使用英文命名：

```
欢迎页面.png → main-interface.png
图1.jpg      → terminal-interface.jpg
图2.png      → system-monitor.png
```

## 支持的引用方式

### 1. 相对路径（推荐）
适用于本地查看和大多数代码托管平台：

```markdown
![图片描述](./assets/images/图片名.png)
```

### 2. GitHub Raw 链接
适用于 GitHub 仓库（需要替换为实际的用户名和仓库名）：

```markdown
![图片描述](https://raw.githubusercontent.com/用户名/仓库名/main/assets/images/图片名.png)
```

### 3. Gitee Raw 链接
适用于 Gitee 仓库：

```markdown
![图片描述](https://gitee.com/用户名/仓库名/raw/main/assets/images/图片名.png)
```

## 优化建议

1. **压缩图片**：使用工具压缩图片以减小仓库大小
2. **选择合适格式**：
   - PNG：适合界面截图、有透明背景
   - JPG：适合照片、渐变丰富的图片
   - WebP：现代浏览器支持，压缩率更高
3. **添加描述文字**：为图片添加有意义的 alt 文本，便于无障碍访问

## 更新说明

如果修改图片名称，请同时更新 `../README.md` 中的引用路径。
