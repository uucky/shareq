import { state } from './state.js';

export const translations = {
  'zh-CN': {
    // login page
    'lobby-subtitle': 'KTV 实时点歌歌单',
    'setup-profile-title': '设置你的歌手档案',
    'setup-username-label': '歌手昵称',
    'setup-username-placeholder': '请输入你的大名...',
    'random-btn': '随机',
    'enter-room-title': '进入 KTV 房间',
    'tab-join': '加入房间',
    'tab-create': '创建新房间',
    'room-id-label': '房间号 (Room Number)',
    'room-id-placeholder': '输入 4-6 位数字或字母房号',
    'join-room-btn-text': '确认进入房间',
    'recent-rooms-text': '最近加入的歌房',
    'create-room-info': '系统将随机生成一个唯一的房间号，您可以将链接发给朋友，大家即可加入同一个房间实时点歌！',
    'create-room-btn-text': '创建并开启点歌房',
    
    // header
    'room-badge-label': '房间号:',
    'online-count-suffix': ' 人在线',
    'widget-default-name': '未登录',
    'widget-default-id': 'ID: --',
    
    // settings dropdown
    'dropdown-theme': ' 切换为亮色/暗色主题',
    'dropdown-compact': ' 切换紧凑模式 (Compact)',
    'dropdown-stats-text': '歌会数据统计 (Stats)',
    'dropdown-about-text': '关于 ShareQ',
    'admin-section-label': ' 管理员特权',
    'dropdown-undo-text': '撤销操作 (Undo)',
    'dropdown-redo-text': '重做操作 (Redo)',
    'dropdown-prev-text': '播放上一首 (Previous)',
    'dropdown-end-text': '结束本次歌会 (End Session)',
    
    // left column request
    'request-card-title-text': '点歌机 / Request',
    'request-card-subtitle': '麦克风已就绪，点一首最爱的歌吧！',
    'song-title-label': '歌曲名',
    'song-title-placeholder': '例如：七里香',
    'song-singer-label': '歌手名字',
    'song-singer-optional': '(可选)',
    'song-singer-placeholder': '例如：周杰伦',
    'song-link-label': '伴奏链接',
    'song-link-optional': '(可选，如 YouTube/B站等)',
    'song-link-placeholder': '例如：https://youtube.com/...',
    'song-dedicate-label': '指名点歌给某人',
    'song-dedicate-optional': '(可选)',
    'song-dedicate-default': '-- 自己唱 (默认) --',
    'confirm-request-btn': '确认点歌 / Add to Queue',
    'popular-title': '🔥 热门 KTV 点播推荐',
    'members-title-text': '房间成员 / Members',
    'members-subtitle': '当前在线的好友及身份权限',
    
    // right column now playing & playlist
    'now-playing-label-text': '正在演唱 / Now Playing',
    'now-playing-link-text': '打开伴奏链接',
    'now-playing-empty-title': '暂无演唱歌曲',
    'now-playing-empty-subtitle': '点歌后即可在此开启演唱',
    'reaction-gift-label': '给歌手互动送礼：',
    'reaction-rose': '玫瑰花',
    'reaction-clap': '鼓掌',
    'reaction-egg': '扔鸡蛋',
    'reaction-shoe': '丢皮鞋',
    
    'tab-upcoming-text': '已点',
    'tab-history-text': '已唱',
    'tab-stats-tab-text': '歌会统计 / Stats',
    'shuffle-btn-text': '打乱歌单',
    'next-btn-text': '切歌',
    
    // third column
    'messages-title-text': '消息',
    'activities-title': '动态',
    'filter-all': '全部',
    'filter-add': '点歌',
    'filter-pin': '优先',
    'filter-delete': '删除',
    'filter-next': '切歌',
    'no-history-msg': '暂无动态记录',
    'no-messages-msg': '暂无消息',
    
    // modals
    'modal-profile-title': '修改个人歌手信息',
    'modal-username-label': '修改昵称',
    'modal-username-placeholder': '请输入你的新大名...',
    'modal-avatar-label': '选择新的卡通表情',
    'modal-cancel-btn': '取消',
    'modal-save-btn': '保存更改',
    
    'modal-archive-title': '🎉 隐藏彩蛋：导出 KTV 歌单存档',
    'modal-archive-p1': '恭喜你发现了隐藏入口！本功能将打包生成一份本次 KTV 演唱会话的精美网页报告，包括<strong>已唱歌单</strong>与<strong>待播歌单</strong>，记录下点歌顺序、演唱完成时间以及观众对各首歌曲的玫瑰、掌声、鸡蛋等热烈互动数据。',
    'modal-archive-p2': '导出的 HTML 文件自带交互排序逻辑，双击打开即可通过表头对歌曲、歌手、点歌人或互动评分进行过滤与重新排序。',
    'modal-archive-cancel': '关闭',
    'modal-archive-download': ' 一键下载报告 (HTML)',
    
    'modal-about-title': ' 关于 ShareQ',
    'modal-about-author': '作者：',
    'modal-about-version': '版本：',
    'modal-about-stack': '技术栈：Node.js · Express · Socket.IO',
    'modal-about-desc': '专为多人 KTV 聚会实时点歌设计',
    'modal-about-ok': '好的',
    
    // JS alerts, confirms and toasts
    'alert-set-nickname': '请在进入前设定歌手昵称！',
    'alert-invalid-room': '请输入正确的房间号！',
    'empty-playlist-msg': '歌单空空如也，快来点歌展示你的歌喉吧！',
    'empty-history-msg': '暂无唱毕曲目历史记录。',
    'empty-filter-history': '暂无此类型的历史消息',
    'turn-sing-toast': '🎤 轮到你唱歌啦！当前播放歌曲：《{title}》',
    'turn-sing-overlay-title': '轮到你上台啦！',
    'turn-sing-overlay-p': '正在播放你点的歌曲：',
    'turn-sing-overlay-btn': '我已准备好',
    'reaction-no-song': '❌ 当前没有正在演唱的歌曲，无法发送互动！',
    'reaction-mute-toast': '🔇 互动礼物音效已静音',
    'reaction-unmute-toast': '🔊 互动礼物音效已开启',
    'error-nickname-empty': '昵称不能为空！',
    'confirm-transfer-host': '⚠️ 警告：您确定要将房主（主持人）权限完全移交给“{username}”吗？此操作将不可逆，您将被降为房管！',
    'confirm-kick-user': '确定要踢出用户“{username}”吗？',
    'confirm-end-session-1': '⚠️ 警告：您确定要结束本次歌会吗？这将会清空所有歌单、切歌历史并重置房间状态！',
    'confirm-end-session-2': '⚠️⚠️ 请再次确认：此操作将清空整个房间的歌单，所有排队歌曲以及历史记录均会丢失！确定继续吗？',
    'confirm-end-session-3': '🚨🚨🚨 最终安全确认：您真的要立即结束本次 KTV 歌会吗？',
    'theme-toggle-light': ' 切换为亮色主题',
    'theme-toggle-dark': ' 切换为暗色主题',
    'compact-toggle-regular': ' 切换为常规模式',
    'compact-toggle-compact': ' 切换为紧凑模式',
    'dedication-toast': '🎁 {username} 为你指名点播了《{title}》',
    'dedicate-accept': '接受',
    'dedicate-decline': '拒绝',
    'dedicate-for-you': '为你指名',
    
    // stats rendering keys
    'stat-singer-title': ' 今日麦霸',
    'stat-singer-empty': '暂无已唱歌曲',
    'stat-singer-populated': '演唱了 {count} 首歌曲',
    'stat-singer-no-data': '暂无歌手数据',
    
    'stat-artist-title': ' 热门点播歌手',
    'stat-artist-empty': '暂无歌手点播数据',
    'stat-artist-populated': '被点播 {count} 次',
    'stat-artist-no-data': '暂无点歌记录',
    
    'stat-song-title': ' 人气金曲',
    'stat-song-empty': '暂无赠礼点赞',
    'stat-song-populated': '{singer} - 获赞 {score} 次',
    'stat-songs-unit': '{count} 首',
    'stat-times-unit': '{count} 次',
    
    // miscellaneous titles
    'title-back-home': '返回首页重新输入房间号',
    'title-copy-link': '点击复制分享链接',
    'title-double-click-export': '双击导出歌单存档',
    'title-more-options': '更多选项',
    'title-edit-profile': '修改歌手昵称/头像',
    'title-random-gen': '随机生成',
    'title-upload-avatar': '上传头像图片',
    'title-accompaniment-link': '伴奏链接',
    'title-dedicate-for': '指名点歌给某人',
    'title-dedicate-tag-suffix': ' 指名',
    'title-delete-song': '删除该歌曲',
    'title-prioritize-song': '置顶这首歌 (移到最前)',
    'title-gift-rose': '送上玫瑰花 (Rose)',
    'title-gift-clap': '热烈鼓掌 (Applause)',
    'title-gift-egg': '扔臭鸡蛋 (Egg)',
    'title-gift-shoe': '扔旧皮鞋 (Shoe)',
    'title-gift-mute': '静音/取消静音礼物音效',
    'title-shuffle-desc': '打乱所有未优先歌曲的顺序',
    'title-next-desc': '切歌 (仅主持人/房管)',
    'title-bell-desc': '消息与动态',
    'title-commit-link': '在 GitHub 上查看提交 {commit}',
    'title-role-host': ' 主持人',
    'title-role-mod': ' 房管',
    'title-action-mod-cancel': '取消房管',
    'title-action-mod-set': '设为房管',
    'title-action-transfer': '移交主持人',
    'title-action-kick': '踢出房间',
    
    'history-item-sung': ' 唱毕: ',
    'lang-toggle-label': '切换为 English',
    
    // JS-rendered dynamic strings
    'online-count': '{count} 人在线',
    'song-count-badge': '{count} 首',
    'unknown-singer': '未知歌手',
    'unknown-singer-short': '未知',
    'no-singer-specified': '未指定歌手',
    'accompaniment-link-title': '伴奏链接',
    'accompaniment-link-text': ' 伴奏',
    'kick-btn-text': ' 踢',
    'history-room-label': '房间号: {roomId}',
    'history-room-date': '上次进入: {date}',
    'history-room-join': ' 快捷进入',
    'clipboard-success': '📋 分享链接已复制到剪贴板！可以直接发送给好友！',
    'clipboard-fallback': '当前分享链接：{url}',
    'dedication-failed': '❌ 指名点歌失败: {message}',
    'dedication-pending': '📤 已向 {username} 发送指名点歌《{title}》，等待接受...',
    'session-ended-alert': '📢 主持人或房管已结束并关闭了本次 KTV 歌会会话。',
    'kicked-by-admin': '您已被房主或管理员移出当前房间！',
    'kicked-session-takeover': '您的歌手ID在另一个窗口重新登入，当前连接已断开！',

    // server-sent messages
    'server-save-failed': '歌单保存失败，请稍后重试',
    'server-invalid-join': '房间号、昵称或用户 ID 无效，请检查后重试',
    'server-username-taken': '昵称“{username}”已在此房间中被占用，请更换昵称后重新加入！',
    'server-invalid-request': '请求参数无效，请刷新后重试',
    'server-invalid-song': '点歌信息无效，请填写歌曲名称',
    'server-rate-limit': '操作太频繁，请稍后再试',
    'server-add-song': '{username} 点了《{title}》',
    'server-invalid-dedication': '指名点歌信息无效',
    'server-user-offline': '该用户已下线或不存在',
    'server-dedication-accepted-room': '🎵 {targetUsername} 接受了 {fromUsername} 的指名点歌《{title}》',
    'server-dedication-accepted-self': '🎉 {targetUsername} 接受了你指名点播的《{title}》！',
    'server-dedication-declined-self': '❌ {targetUsername} 拒绝了你指名点播的《{title}》',
    'server-pin-song': '{username} 置顶了《{title}》',
    'server-delete-forbidden': '您只能删除自己点的歌曲！',
    'server-delete-song': '{username} 删除了《{title}》',
    'server-shuffle-forbidden': '只有主持人或房管可以打乱歌单',
    'server-shuffle': '{username} 打乱了歌单',
    'server-next-song': '{username} 开启了下一首，已移至已唱《{title}》',
    'server-prev-song': '{username} 返回了上一首《{title}》',
    'server-undo': '{username} 执行了撤销',
    'server-redo': '{username} 执行了前进',
    'server-kick-user': '{username} 被管理员移出了房间'
  },
  'en': {
    // login page
    'lobby-subtitle': 'KTV Real-time Playlist',
    'setup-profile-title': 'Set Up Your Profile',
    'setup-username-label': 'Nickname',
    'setup-username-placeholder': 'Enter your nickname...',
    'random-btn': 'Random',
    'enter-room-title': 'Enter KTV Room',
    'tab-join': 'Join Room',
    'tab-create': 'Create Room',
    'room-id-label': 'Room Number',
    'room-id-placeholder': 'Enter 4-6 chars/digits room code',
    'join-room-btn-text': 'Join Room',
    'recent-rooms-text': 'Recent Rooms',
    'create-room-info': 'The system will generate a unique room ID. Send the link to friends so they can join and request songs in real-time!',
    'create-room-btn-text': 'Create Room',
    
    // header
    'room-badge-label': 'Room:',
    'online-count-suffix': ' online',
    'widget-default-name': 'Guest',
    'widget-default-id': 'ID: --',
    
    // settings dropdown
    'dropdown-theme': ' Toggle Theme',
    'dropdown-compact': ' Toggle Compact Mode',
    'dropdown-stats-text': 'Stats Dashboard',
    'dropdown-about-text': 'About ShareQ',
    'admin-section-label': ' Admin Privileges',
    'dropdown-undo-text': 'Undo Action',
    'dropdown-redo-text': 'Redo Action',
    'dropdown-prev-text': 'Play Previous',
    'dropdown-end-text': 'End Session',
    
    // left column request
    'request-card-title-text': 'Song Request',
    'request-card-subtitle': 'Microphone ready! Request your favorite song.',
    'song-title-label': 'Song Title',
    'song-title-placeholder': 'e.g. Yesterday Once More',
    'song-singer-label': 'Artist',
    'song-singer-optional': '(Optional)',
    'song-singer-placeholder': 'e.g. The Carpenters',
    'song-link-label': 'Accompaniment Link',
    'song-link-optional': '(Optional, YouTube/Bilibili etc.)',
    'song-link-placeholder': 'e.g. https://youtube.com/...',
    'song-dedicate-label': 'Dedicate Song',
    'song-dedicate-optional': '(Optional)',
    'song-dedicate-default': '-- Sing by myself (Default) --',
    'confirm-request-btn': 'Confirm / Add to Queue',
    'popular-title': '🔥 Popular KTV Suggestions',
    'members-title-text': 'Room Members',
    'members-subtitle': 'Online friends and permissions',
    
    // right column now playing & playlist
    'now-playing-label-text': 'Now Playing',
    'now-playing-link-text': 'Open Accompaniment',
    'now-playing-empty-title': 'No Song Playing',
    'now-playing-empty-subtitle': 'Add songs to queue to start singing',
    'reaction-gift-label': 'Interact & Send Gifts:',
    'reaction-rose': 'Rose',
    'reaction-clap': 'Applause',
    'reaction-egg': 'Egg',
    'reaction-shoe': 'Shoe',
    
    'tab-upcoming-text': 'Queue',
    'tab-history-text': 'History',
    'tab-stats-tab-text': 'Stats',
    'shuffle-btn-text': 'Shuffle Queue',
    'next-btn-text': 'Next Song',
    
    // third column
    'messages-title-text': 'Messages',
    'activities-title': 'Activities',
    'filter-all': 'All',
    'filter-add': 'Add',
    'filter-pin': 'Pin',
    'filter-delete': 'Delete',
    'filter-next': 'Next',
    'no-history-msg': 'No activities yet',
    'no-messages-msg': 'No messages',
    
    // modals
    'modal-profile-title': 'Edit Singer Profile',
    'modal-username-label': 'Edit Nickname',
    'modal-username-placeholder': 'Enter new nickname...',
    'modal-avatar-label': 'Choose Emoji',
    'modal-cancel-btn': 'Cancel',
    'modal-save-btn': 'Save Changes',
    
    'modal-archive-title': '🎉 Easter Egg: Export KTV Session Archive',
    'modal-archive-p1': 'Congratulations on finding the hidden entry! This feature packs a beautiful HTML report of the current KTV session, containing the <strong>Sung History</strong> and the <strong>Upcoming Queue</strong>, tracking order, singer completion times, and audience interactions like roses, applause, and eggs.',
    'modal-archive-p2': 'The exported HTML file has sorting capabilities: double-click to open and click headers to filter and sort by song, artist, requester, or ratings.',
    'modal-archive-cancel': 'Close',
    'modal-archive-download': ' Download Report (HTML)',
    
    'modal-about-title': ' About ShareQ',
    'modal-about-author': 'Author: ',
    'modal-about-version': 'Version: ',
    'modal-about-stack': 'Stack: Node.js · Express · Socket.IO',
    'modal-about-desc': 'Designed for multi-user KTV real-time song requesting',
    'modal-about-ok': 'OK',
    
    // JS alerts, confirms and toasts
    'alert-set-nickname': 'Please set your nickname before entering!',
    'alert-invalid-room': 'Please enter a valid room number!',
    'empty-playlist-msg': 'Playlist is empty, add a song to show off your voice!',
    'empty-history-msg': 'No sung song history yet.',
    'empty-filter-history': 'No history messages of this type',
    'turn-sing-toast': "🎤 It's your turn to sing! Current song: <{title}>",
    'turn-sing-overlay-title': "It's your turn to sing!",
    'turn-sing-overlay-p': 'Singing your requested song:',
    'turn-sing-overlay-btn': 'I am ready',
    'reaction-no-song': '❌ No song currently playing, cannot send gifts!',
    'reaction-mute-toast': '🔇 Gift sound effects muted',
    'reaction-unmute-toast': '🔊 Gift sound effects unmuted',
    'error-nickname-empty': 'Nickname cannot be empty!',
    'confirm-transfer-host': '⚠️ Warning: Are you sure you want to transfer host privileges to "{username}"? This action is irreversible, and you will be demoted to Moderator!',
    'confirm-kick-user': 'Are you sure you want to kick user "{username}"?',
    'confirm-end-session-1': '⚠️ Warning: Are you sure you want to end this KTV session? This will clear all queue, history, and reset room state!',
    'confirm-end-session-2': '⚠️⚠️ Double confirm: This action will clear all songs and history! Are you sure you want to proceed?',
    'confirm-end-session-3': '🚨🚨🚨 Final safety check: Do you really want to end this KTV session immediately?',
    'theme-toggle-light': ' Switch to Light Theme',
    'theme-toggle-dark': ' Switch to Dark Theme',
    'compact-toggle-regular': ' Switch to Regular Mode',
    'compact-toggle-compact': ' Switch to Compact Mode',
    'dedication-toast': '🎁 {username} dedicated <{title}> to you',
    'dedicate-accept': 'Accept',
    'dedicate-decline': 'Decline',
    'dedicate-for-you': 'dedicated to you',
    
    // stats rendering keys
    'stat-singer-title': ' Top Singer Today',
    'stat-singer-empty': 'No songs sung yet',
    'stat-singer-populated': 'Sang {count} song(s)',
    'stat-singer-no-data': 'No singer data',
    
    'stat-artist-title': ' Top Requested Artists',
    'stat-artist-empty': 'No artist request data',
    'stat-artist-populated': 'Requested {count} time(s)',
    'stat-artist-no-data': 'No requests yet',
    
    'stat-song-title': ' Most Popular Song',
    'stat-song-empty': 'No reactions/likes yet',
    'stat-song-populated': '{singer} - liked {score} times',
    'stat-songs-unit': '{count} song(s)',
    'stat-times-unit': '{count} time(s)',
    
    // miscellaneous titles
    'title-back-home': 'Back to lobby',
    'title-copy-link': 'Click to copy share link',
    'title-double-click-export': 'Double click to export playlist archive',
    'title-more-options': 'More Options',
    'title-edit-profile': 'Edit Nickname/Avatar',
    'title-random-gen': 'Randomize Name',
    'title-upload-avatar': 'Upload Avatar',
    'title-accompaniment-link': 'Accompaniment Link',
    'title-dedicate-for': 'Dedicate Song',
    'title-dedicate-tag-suffix': ' Dedicated',
    'title-delete-song': 'Delete this song',
    'title-prioritize-song': 'Pin to top',
    'title-gift-rose': 'Send Rose',
    'title-gift-clap': 'Send Applause',
    'title-gift-egg': 'Throw Egg',
    'title-gift-shoe': 'Throw Shoe',
    'title-gift-mute': 'Mute/Unmute Gift Sounds',
    'title-shuffle-desc': 'Shuffle all non-pinned songs',
    'title-next-desc': 'Next Song (Host/Mod only)',
    'title-bell-desc': 'Messages & Activities',
    'title-commit-link': 'Open commit {commit} on GitHub',
    'title-role-host': ' Host',
    'title-role-mod': ' Mod',
    'title-action-mod-cancel': 'Remove Mod',
    'title-action-mod-set': 'Make Mod',
    'title-action-transfer': 'Transfer Host',
    'title-action-kick': 'Kick from Room',
    
    'history-item-sung': ' Sung: ',
    'lang-toggle-label': '切换为 中文',
    
    // JS-rendered dynamic strings
    'online-count': '{count} online',
    'song-count-badge': '{count} song(s)',
    'unknown-singer': 'Unknown Artist',
    'unknown-singer-short': 'Unknown',
    'no-singer-specified': 'No artist specified',
    'accompaniment-link-title': 'Accompaniment Link',
    'accompaniment-link-text': ' Link',
    'kick-btn-text': ' Kick',
    'history-room-label': 'Room: {roomId}',
    'history-room-date': 'Last joined: {date}',
    'history-room-join': ' Quick Join',
    'clipboard-success': '📋 Share link copied to clipboard!',
    'clipboard-fallback': 'Share link: {url}',
    'dedication-failed': '❌ Song dedication failed: {message}',
    'dedication-pending': '📤 Sent song dedication <{title}> to {username}, waiting for response...',
    'session-ended-alert': '📢 The host or moderator has ended this KTV session.',
    'kicked-by-admin': 'You have been kicked from the room by the host or moderator!',
    'kicked-session-takeover': 'Your account logged in from another window. This session has been disconnected!',

    // server-sent messages
    'server-save-failed': 'Failed to save the playlist. Please try again later.',
    'server-invalid-join': 'Invalid room number, nickname, or user ID. Please check and try again.',
    'server-username-taken': 'Nickname "{username}" is already in use in this room. Choose another nickname and rejoin.',
    'server-invalid-request': 'Invalid request. Please refresh and try again.',
    'server-invalid-song': 'Invalid song request. Please enter a song title.',
    'server-rate-limit': 'Too many actions. Please try again later.',
    'server-add-song': '{username} added <{title}>',
    'server-invalid-dedication': 'Invalid song dedication.',
    'server-user-offline': 'That user is offline or does not exist.',
    'server-dedication-accepted-room': '🎵 {targetUsername} accepted {fromUsername}\'s dedication <{title}>',
    'server-dedication-accepted-self': '🎉 {targetUsername} accepted your dedication <{title}>!',
    'server-dedication-declined-self': '❌ {targetUsername} declined your dedication <{title}>',
    'server-pin-song': '{username} pinned <{title}>',
    'server-delete-forbidden': 'You can only delete songs you requested!',
    'server-delete-song': '{username} deleted <{title}>',
    'server-shuffle-forbidden': 'Only the host or moderators can shuffle the queue.',
    'server-shuffle': '{username} shuffled the queue',
    'server-next-song': '{username} started the next song and moved <{title}> to history',
    'server-prev-song': '{username} restored the previous song <{title}>',
    'server-undo': '{username} ran undo',
    'server-redo': '{username} ran redo',
    'server-kick-user': '{username} was removed from the room by an admin'
  }
};

export function t(key, params = {}) {
  const currentLang = state.language || 'zh-CN';
  const dict = translations[currentLang] || translations['zh-CN'];
  let text = dict[key] || translations['zh-CN'][key] || key;
  
  for (const [paramKey, paramVal] of Object.entries(params)) {
    text = text.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramVal));
  }
  return text;
}

export function translatePage() {
  const currentLang = state.language || 'zh-CN';
  
  document.documentElement.lang = currentLang;

  // Text contents / HTML
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val) {
      el.innerHTML = val;
    }
  });

  // Placeholders
  const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
  placeholders.forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    const val = t(key);
    if (val) {
      el.placeholder = val;
    }
  });

  // Titles
  const titles = document.querySelectorAll('[data-i18n-title]');
  titles.forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    const val = t(key);
    if (val) {
      el.title = val;
    }
  });
}
