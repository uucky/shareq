# 🎤 ShareQ

**共享卡拉OK歌单系统** — 专为多人 KTV 聚会设计的实时点歌 Web 应用

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-24+-339933?logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/Socket.IO-4.x-010101?logo=socketdotio&logoColor=white" alt="Socket.IO">
  <img src="https://img.shields.io/badge/license-ISC-blue" alt="License">
  <img src="https://img.shields.io/badge/version-v1.3.0-ff2a85" alt="Version">
</p>

---

## ✨ 功能亮点

### 🏠 房间系统
- 随机生成 5 位房间号，或输入已有房间号快速加入
- 房间链接一键复制分享，好友点击即可直接进入
- 最近加入过的歌房历史记录，方便快捷重连

### 🎵 点歌与队列
- 填写歌名、歌手（可选）、伴奏链接（可选）即可点歌
- 热门 KTV 歌曲推荐标签，一键快速点播
- 待播歌单 / 已唱历史 / 歌会统计 三大标签页切换
- 歌曲置顶优先、打乱歌单顺序

### 👤 歌手档案
- 自定义昵称 + 70 余款 Emoji 头像
- 支持上传本地图片作为自定义头像（Canvas 自动裁剪压缩）
- 歌手设置持久化，刷新后自动恢复

### 🎭 角色与权限
| 角色 | 权限 |
|------|------|
| **主持人 (Host)** | 切歌、撤销/重做、上一首、任命/取消房管、移交主持人、踢人、结束歌会 |
| **房管 (Moderator)** | 切歌、踢出普通用户 |
| **普通成员** | 点歌、删除/切换自己的歌、发送互动礼物 |

### 🎁 互动特效
- 🌹 玫瑰花 · 👏 鼓掌 · 🥚 扔鸡蛋 · 👞 丢皮鞋
- 每种礼物配有独立的 Web Audio 合成音效
- 实时浮动表情动画 + 礼物计数统计

### 🔔 系统通知
- 右下角实时 Toast 消息推送
- 消息历史面板，支持按类型筛选（点歌/优先/删除/切歌/其他）
- 轮到自己唱歌时弹出全屏提醒 + 提示音

### 🌗 主题切换
- 精美暗色 / 亮色双主题，一键切换
- 主题偏好自动持久化

### 📊 歌会统计
- 🏆 今日麦霸（谁唱的最多）
- 🎵 热门点播歌手排行
- ❤️ 人气金曲（互动礼物数最高）

### 🎉 彩蛋
- 左下角隐藏图标 → 导出完整 KTV 会话存档为交互式 HTML 报告
- 报告包含歌单、统计、时区切换、表头排序等高级功能

---

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 18

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/uucky/shareq.git
cd shareq

# 安装依赖
npm install

# 启动服务器
node server.js
```

服务启动后访问 **http://localhost:3000** 即可使用。

### 部署

ShareQ 是纯 Node.js 应用，可部署到任何支持 Node.js 的平台：

- **本地局域网**: 直接运行，同网段设备通过 `http://<你的IP>:3000` 访问
- **Docker**: 编写简单的 Dockerfile 即可容器化部署
- **云服务**: Railway / Render / Fly.io / VPS 均可

端口通过环境变量 `PORT` 自定义，默认 `3000`。

---

## 🏗️ 技术架构

```
shareq/
├── server.js          # Express + Socket.IO 服务端
├── public/
│   ├── index.html     # 单页应用 HTML 结构
│   ├── app.js         # 客户端逻辑 (WebSocket, DOM, Web Audio)
│   └── style.css      # 全局样式 (CSS 变量, 亮/暗主题)
├── data/              # 房间数据持久化存储
├── changelog.md       # 更新日志
└── package.json
```

- **实时同步**: Socket.IO 双向通信，歌单/成员/互动全房间实时同步
- **数据持久化**: 房间数据以 JSON 形式存储在 `data/` 目录，服务重启后自动恢复
- **零依赖前端**: 纯 HTML + CSS + Vanilla JS，无需构建工具
- **音效合成**: Web Audio API 实时合成互动音效，无需加载音频文件

---

## 📝 更新日志

详见 [changelog.md](./changelog.md)

**当前版本: v1.3.0** — 自定义头像上传、轮唱提醒、自主切/删歌、关于弹窗

---

## 📄 License

[ISC](./LICENSE)

---

<p align="center">
  <strong>ShareQ</strong> 共享卡拉OK歌单系统 · Made with ❤️ by <a href="https://github.com/uucky">uucky</a>
</p>
