// 应用主 JavaScript
let currentPage = 1;
let currentView = 'timeline';
let currentTag = '';
let currentDate = '';
let selectedDate = ''; // 存储日历中选中的日期
let currentFilter = ''; // 当前内容筛选器: 'pinned', 'links', 'todo', 'code'
let isLoading = false;
let hasMoreData = true;
let currentCalendarYear = new Date().getFullYear();
let currentCalendarMonth = new Date().getMonth();
let dailyMemoCounts = {}; // 存储每日笔记数量
let currentSortBy = 'created_at'; // 当前排序字段
let currentSortOrder = 'DESC'; // 当前排序顺序
let publishVditor = null; // 发布区 Vditor 实例
let mobileVditor = null; // 移动端 Vditor 实例
let currentTags = []; // 当前输入的标签列表
let mobileTags = []; // 移动端当前标签列表
let attachmentViewMode = 'grid'; // 附件视图模式: 'grid' 或 'list'
let attachmentPage = 1; // 附件当前页码
let attachmentPerPage = 15; // 附件每页数量

// Toast 消息系统
function showToast(message, type = 'info', duration = 4000) {
    // 创建 toast 容器（如果不存在）
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    // 创建 toast 元素
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // 根据类型设置图标
    let icon = '';
    switch (type) {
        case 'success':
            icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22,4 12,14.01 9,11.01"></polyline></svg>';
            break;
        case 'error':
            icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
            break;
        case 'warning':
            icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
            break;
        default:
            icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">${message}</div>
        <button class="toast-close" onclick="closeToast(this)">&times;</button>
    `;
    
    // 添加到容器
    container.appendChild(toast);
    
    // 自动关闭
    if (duration > 0) {
        setTimeout(() => {
            closeToast(toast.querySelector('.toast-close'));
        }, duration);
    }
}

function closeToast(closeBtn) {
    const toast = closeBtn.closest('.toast');
    if (toast) {
        toast.classList.add('slide-out');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    // 确保marked和Prism都已加载
    if (typeof marked !== 'undefined' && typeof Prism !== 'undefined') {
        initMarked();
        console.log('Marked和Prism.js初始化完成');
    } else {
        console.warn('Marked或Prism.js未正确加载');
    }
    
    // 初始化发布区 Vditor
    initPublishVditor();
    
    // 恢复日历侧边栏状态
    const filterSidebarHidden = localStorage.getItem('filterSidebarHidden') === 'true';
    if (filterSidebarHidden) {
        const filterSidebar = document.querySelector('.filter-sidebar');
        if (filterSidebar) {
            filterSidebar.classList.add('hidden');
        }
    }
    
    // 恢复附件视图模式
    const savedViewMode = localStorage.getItem('attachmentViewMode');
    if (savedViewMode) {
        attachmentViewMode = savedViewMode;
    }
    
    // 恢复附件每页数量
    const savedPerPage = localStorage.getItem('attachmentPerPage');
    if (savedPerPage) {
        attachmentPerPage = parseInt(savedPerPage);
    }
    
    loadMemos('', false); // 明确指定append = false
    loadTags();
    setupEventListeners();
    initCalendar();
    setupInfiniteScroll();
    setupCalendarClickOutside();
});

// 初始化发布区 Vditor
function initPublishVditor() {
    if (typeof Vditor === 'undefined') {
        console.warn('Vditor未加载');
        return;
    }
    
    publishVditor = new Vditor('vditorPublish', {
        minHeight: 150,
        height: 'auto',
        mode: 'ir',
        placeholder: '写下你的想法... (Ctrl+Enter 发布)',
        hint: {
            emoji: getEmojiConfig()
        },
        resize: {
            enable: true,
            position: 'bottom'
        },
        toolbar: [
            'emoji',
            'headings',
            'bold',
            'italic',
            'strike',
            'link',
            '|',
            'list',
            'ordered-list',
            'check',
            'quote',
            'line',
            'code',
            'inline-code',
            '|',
            'table',
            '|',
            'fullscreen'
        ],
        upload: {
            url: 'api.php?action=upload',
            fieldName: 'file',
            max: 10 * 1024 * 1024,
            format(files, responseText) {
                const response = JSON.parse(responseText);
                if (response.data && response.data.url) {
                    return JSON.stringify({
                        msg: '',
                        code: 0,
                        data: {
                            errFiles: [],
                            succMap: {
                                [files[0].name]: response.data.url
                            }
                        }
                    });
                }
                return responseText;
            }
        },
        counter: {
            enable: true,
            type: 'text'
        },
        cache: {
            enable: false
        },
        ctrlEnter: saveMemo
    });
}

// 获取 Emoji 配置（复用）
function getEmojiConfig() {
    return {
        'grinning': '😀',
        'smiley': '😃',
        'smile': '😄',
        'grin': '😁',
        'laughing': '😆',
        'sweat_smile': '😅',
        'joy': '😂',
        'slightly_smiling_face': '🙂',
        'upside_down_face': '🙃',
        'wink': '😉',
        'blush': '😊',
        'innocent': '😇',
        'smiling_face_with_hearts': '🥰',
        'heart_eyes': '😍',
        'star_struck': '🤩',
        'kissing_heart': '😘',
        'kissing': '😗',
        'kissing_closed_eyes': '😚',
        'kissing_smiling_eyes': '😙',
        'yum': '😋',
        'stuck_out_tongue': '😛',
        'stuck_out_tongue_winking_eye': '😜',
        'zany_face': '🤪',
        'stuck_out_tongue_closed_eyes': '😝',
        'hugs': '🤗',
        'hand_over_mouth': '🤭',
        'shushing_face': '🤫',
        'thinking': '🤔',
        'zipper_mouth_face': '🤐',
        'raised_eyebrow': '🤨',
        'neutral_face': '😐',
        'expressionless': '😑',
        'no_mouth': '😶',
        'roll_eyes': '🙄',
        'smirk': '😏',
        'persevere': '😣',
        'disappointed_relieved': '😥',
        'open_mouth': '😮',
        'hushed': '😯',
        'sleepy': '😪',
        'tired_face': '😫',
        'yawning_face': '🥱',
        'sleeping': '😴',
        'relieved': '😌',
        'drooling_face': '🤤',
        'unamused': '😒',
        'sweat': '😓',
        'pensive': '😔',
        'confused': '😕',
        'smiling_face_with_tear': '🥲',
        'grimacing': '😬',
        'lying_face': '🤥',
        'face_with_thermometer': '🤒',
        'face_with_head_bandage': '🤕',
        'nauseated_face': '🤢',
        'vomiting_face': '🤮',
        'sneezing_face': '🤧',
        'mask': '😷',
        'hot_face': '🥵',
        'cold_face': '🥶',
        'woozy_face': '🥴',
        'dizzy_face': '😵',
        'exploding_head': '🤯',
        'cowboy_hat_face': '🤠',
        'sunglasses': '😎',
        'disguised_face': '🥸',
        'nerd_face': '🤓',
        'monocle_face': '🧐',
        'worried': '😟',
        'slightly_frowning_face': '🙁',
        'frowning_face': '☹️',
        'astonished': '😲',
        'pleading_face': '🥺',
        'flushed': '😳',
        'fearful': '😨',
        'anxious_face_with_sweat': '😰',
        'cry': '😢',
        'sob': '😭',
        'scream': '😱',
        'confounded': '😖',
        'disappointed': '😞',
        'weary': '😩',
        'triumph': '😤',
        'rage': '😡',
        'angry': '😠',
        'cursing_face': '🤬',
        'smiling_imp': '😈',
        'imp': '👿',
        'skull': '💀',
        'skull_and_crossbones': '☠️',
        'poop': '💩',
        'clown_face': '🤡',
        'ogre': '👹',
        'goblin': '👺',
        'ghost': '👻',
        'alien': '👽',
        'space_invader': '👾',
        'robot': '🤖',
        'jack_o_lantern': '🎃',
        'thumbsup': '👍',
        'thumbsdown': '👎',
        'ok_hand': '👌',
        'v': '✌️',
        'crossed_fingers': '🤞',
        'love_you_gesture': '🤟',
        'metal': '🤘',
        'call_me_hand': '🤙',
        'wave': '👋',
        'raised_back_of_hand': '🤚',
        'raised_hand_with_fingers_splayed': '🖐️',
        'hand': '✋',
        'vulcan_salute': '🖖',
        'fist_oncoming': '👊',
        'fist_left': '🤛',
        'fist_right': '🤜',
        'clap': '👏',
        'raised_hands': '🙌',
        'open_hands': '👐',
        'palms_up_together': '🤲',
        'pray': '🙏',
        'writing_hand': '✍️',
        'nail_care': '💅',
        'handshake': '🤝',
        'heart': '❤️',
        'orange_heart': '🧡',
        'yellow_heart': '💛',
        'green_heart': '💚',
        'blue_heart': '💙',
        'purple_heart': '💜',
        'brown_heart': '🤎',
        'black_heart': '🖤',
        'white_heart': '🤍',
        'broken_heart': '💔',
        'heart_exclamation': '❣️',
        'two_hearts': '💕',
        'revolving_hearts': '💞',
        'heartbeat': '💓',
        'heartpulse': '💗',
        'sparkling_heart': '💖',
        'cupid': '💘',
        'gift_heart': '💝',
        'heart_decoration': '💟',
        'star': '⭐',
        'sparkles': '✨',
        'zap': '⚡',
        'fire': '🔥',
        'rainbow': '🌈',
        'sunny': '☀️',
        'sun_behind_small_cloud': '🌤️',
        'partly_sunny': '⛅',
        'cloud': '☁️',
        'cloud_with_rain': '🌧️',
        'cloud_with_lightning_and_rain': '⛈️',
        'cloud_with_lightning': '🌩️',
        'cloud_with_snow': '🌨️',
        'snowflake': '❄️',
        'droplet': '💧',
        'sweat_drops': '💦',
        'ocean': '🌊',
        'green_apple': '🍏',
        'apple': '🍎',
        'pear': '🍐',
        'tangerine': '🍊',
        'lemon': '🍋',
        'watermelon': '🍉',
        'grapes': '🍇',
        'strawberry': '🍓',
        'blueberries': '🫐',
        'melon': '🍈',
        'cherries': '🍒',
        'peach': '🍑',
        'mango': '🥭',
        'pineapple': '🍍',
        'coconut': '🥥',
        'kiwi_fruit': '🥝',
        'tomato': '🍅',
        'avocado': '🥑',
        'hamburger': '🍔',
        'hotdog': '🌭',
        'pizza': '🍕',
        'sandwich': '🥪',
        'taco': '🌮',
        'burrito': '🌯',
        'stuffed_flatbread': '🥙',
        'falafel': '🧆',
        'ramen': '🍜',
        'sushi': '🍣',
        'bento': '🍱',
        'dumpling': '🥟',
        'fortune_cookie': '🥠',
        'cupcake': '🧁',
        'cake': '🍰',
        'cookie': '🍪',
        'doughnut': '🍩',
        'chocolate_bar': '🍫',
        'soccer': '⚽',
        'basketball': '🏀',
        'football': '🏈',
        'baseball': '⚾',
        'tennis': '🎾',
        'volleyball': '🏐',
        'rugby_football': '🏉',
        '8ball': '🎱',
        'ping_pong': '🏓',
        'badminton': '🏸',
        'goal_net': '🥅',
        'golf': '⛳',
        'ice_hockey': '🏒',
        'field_hockey': '🏑',
        'lacrosse': '🥍',
        'roller_skate': '🛼',
        'skateboard': '🛹'
    };
}

// 配置 Markdown 解析器
function initMarked() {
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            highlight: function(code, lang) {
                if (lang && Prism.languages[lang]) {
                    try {
                        return Prism.highlight(code, Prism.languages[lang], lang);
                    } catch (err) {
                        console.warn('Prism代码高亮失败:', err);
                    }
                }
                // 如果没有指定语言或语言不支持，使用自动检测
                try {
                    return Prism.highlight(code, Prism.languages.auto);
                } catch (err) {
                    console.warn('Prism自动代码高亮失败:', err);
                    return code;
                }
            },
            breaks: true,
            gfm: true,
            langPrefix: 'language-'
        });
    }
}

// 渲染Markdown内容
function renderMarkdown(content) {
    if (typeof marked !== 'undefined') {
        try {
            return marked.parse(content);
        } catch (error) {
            console.error('Markdown解析失败:', error);
            return content.replace(/\n/g, '<br>');
        }
    } else {
        return content.replace(/\n/g, '<br>');
    }
}

// 执行搜索
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const searchTerm = searchInput.value.trim();
        currentPage = 1;
        hasMoreData = true;
        loadMemos(searchTerm, false);
    }
}

// 添加标签
function addTag(tagName) {
    tagName = tagName.trim().replace(/^#/, ''); // 移除开头的#
    if (!tagName || currentTags.includes(tagName)) {
        return; // 空标签或重复标签不添加
    }
    
    currentTags.push(tagName);
    renderTags();
}

// 移除标签
function removeTag(index) {
    if (index >= 0 && index < currentTags.length) {
        currentTags.splice(index, 1);
        renderTags();
    }
}

// 渲染标签
function renderTags() {
    const tagChips = document.getElementById('tagChips');
    if (!tagChips) return;
    
    tagChips.innerHTML = currentTags.map((tag, index) => `
        <span class="tag-chip">
            #${tag}
            <span class="tag-chip-remove" onclick="removeTag(${index})">×</span>
        </span>
    `).join('');
}

// 获取所有标签字符串
function getTagsString() {
    return currentTags.join(' ');
}

// 清空标签
function clearTags() {
    currentTags = [];
    renderTags();
}

// 设置事件监听器
function setupEventListeners() {
    // 搜索
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        // 只在按回车键时执行搜索
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    // 导航切换
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            currentView = this.dataset.view;
            handleViewChange(currentView);
            
            // 移动端：点击菜单项后关闭侧边栏
            if (window.innerWidth <= 768) {
                closeMobileSidebar();
            }
        });
    });
    
    // Ctrl+Enter 快捷键发布（通过 Vditor 的 ctrlEnter 配置）
    // 已在 initPublishVditor 中配置
    
    // 标签输入框的键盘事件
    const memoTagsInput = document.getElementById('memoTagsInput');
    if (memoTagsInput) {
        memoTagsInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const value = this.value.trim();
                if (value) {
                    addTag(value);
                    this.value = '';
                } else {
                    // 如果输入为空，执行发布
                    saveMemo();
                }
            } else if (e.key === ' ') {
                e.preventDefault();
                const value = this.value.trim();
                if (value) {
                    addTag(value);
                    this.value = '';
                }
            } else if (e.key === 'Backspace' && this.value === '' && currentTags.length > 0) {
                // 如果输入为空且按退格键，删除最后一个标签
                removeTag(currentTags.length - 1);
            }
        });
    }
    
    // 修改密码表单
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            changePassword();
        });
    }
    
    // 网站设置表单
    const siteSettingsForm = document.getElementById('siteSettingsForm');
    if (siteSettingsForm) {
        siteSettingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveSiteSettings();
        });
    }
}

// 处理视图切换
function handleViewChange(view) {
    currentView = view;
    const contentArea = document.querySelector('.content-area');
    
    // 重置分页状态
    currentPage = 1;
    hasMoreData = true;
    
    switch(view) {
        case 'timeline':
            loadMemos('', false);
            break;
        case 'attachments':
            loadAttachments();
            break;
        case 'stats':
            loadStats();
            break;
        case 'shares':
            loadShareManagement();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// 显示设置页面
function showSettings() {
    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    // 切换到设置视图
    currentView = 'settings';
    loadSettings();
    
    // 移动端：关闭侧边栏
    if (window.innerWidth <= 768) {
        closeMobileSidebar();
    }
}

// 显示帮助弹窗
function showHelpModal() {
    const modal = document.getElementById('helpModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// 隐藏帮助弹窗
function hideHelpModal() {
    const modal = document.getElementById('helpModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// 点击帮助弹窗外部关闭
document.addEventListener('click', function(event) {
    const helpModal = document.getElementById('helpModal');
    if (helpModal && helpModal.style.display === 'flex') {
        if (event.target === helpModal) {
            hideHelpModal();
        }
    }
});

// 切换日历侧边栏显示/隐藏
function toggleFilterSidebar() {
    const filterSidebar = document.querySelector('.filter-sidebar');
    if (filterSidebar) {
        filterSidebar.classList.toggle('hidden');
        
        // 保存状态到localStorage
        const isHidden = filterSidebar.classList.contains('hidden');
        localStorage.setItem('filterSidebarHidden', isHidden);
    }
}

// 移动端：切换侧边栏显示
function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.mobile-overlay');
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('show');
        overlay.classList.toggle('show');
    }
}

// 移动端：关闭侧边栏
function closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.mobile-overlay');
    
    if (sidebar) sidebar.classList.remove('show');
    if (overlay) overlay.classList.remove('show');
}

// 移动端：显示发布弹窗
function showMobilePublishModal() {
    const modal = document.getElementById('mobilePublishModal');
    if (modal) {
        modal.classList.add('show');
        
        // 初始化移动端编辑器（如果还没有初始化）
        if (!mobileVditor && typeof Vditor !== 'undefined') {
            mobileVditor = new Vditor('vditorMobile', {
                minHeight: 300,
                height: 'auto',
                mode: 'ir',
                placeholder: '写下你的想法...',
                hint: {
                    emoji: getEmojiConfig()
                },
                resize: {
                    enable: true,
                    position: 'bottom'
                },
                toolbar: [
                    'emoji',
                    'headings',
                    'bold',
                    'italic',
                    'strike',
                    'link',
                    '|',
                    'list',
                    'ordered-list',
                    'check',
                    'quote',
                    'line',
                    'code',
                    'inline-code',
                    '|',
                    'table'
                ],
                upload: {
                    url: 'api.php?action=upload',
                    fieldName: 'file',
                    max: 10 * 1024 * 1024,
                    format(files, responseText) {
                        const response = JSON.parse(responseText);
                        if (response.data && response.data.url) {
                            return JSON.stringify({
                                msg: '',
                                code: 0,
                                data: {
                                    errFiles: [],
                                    succMap: {
                                        [files[0].name]: response.data.url
                                    }
                                }
                            });
                        }
                        return responseText;
                    }
                }
            });
        }
        
        // 清空移动端标签
        mobileTags = [];
        renderMobileTags();
    }
}

// 移动端：隐藏发布弹窗
function hideMobilePublishModal() {
    const modal = document.getElementById('mobilePublishModal');
    if (modal) {
        modal.classList.remove('show');
        
        // 清空编辑器内容
        if (mobileVditor) {
            mobileVditor.setValue('');
        }
        
        // 清空标签
        mobileTags = [];
        renderMobileTags();
    }
}

// 移动端：渲染标签
function renderMobileTags() {
    const mobileTagChips = document.getElementById('mobileTagChips');
    if (!mobileTagChips) return;
    
    mobileTagChips.innerHTML = '';
    mobileTags.forEach((tag, index) => {
        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        chip.innerHTML = `
            <span>${tag}</span>
            <button onclick="removeMobileTag(${index})">&times;</button>
        `;
        mobileTagChips.appendChild(chip);
    });
}

// 移动端：添加标签
function addMobileTag(tagName) {
    if (!tagName || mobileTags.includes(tagName)) return;
    mobileTags.push(tagName);
    renderMobileTags();
}

// 移动端：删除标签
function removeMobileTag(index) {
    mobileTags.splice(index, 1);
    renderMobileTags();
}

// 移动端：上传图片
async function uploadImageToMobile(input) {
    const file = input.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('api.php?action=upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.data && result.data.url) {
            if (mobileVditor) {
                const markdown = `![${result.data.original_name}](${result.data.url})`;
                mobileVditor.insertValue(markdown);
            }
        }
    } catch (error) {
        console.error('上传图片失败:', error);
        showToast('上传失败，请重试', 'error');
    }
    
    input.value = '';
}

// 移动端：上传附件
async function uploadFileToMobile(input) {
    const file = input.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('api.php?action=upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.data && result.data.url) {
            if (mobileVditor) {
                const markdown = `[${result.data.original_name}](${result.data.url})`;
                mobileVditor.insertValue(markdown);
            }
        }
    } catch (error) {
        console.error('上传文件失败:', error);
        showToast('上传失败，请重试', 'error');
    }
    
    input.value = '';
}

// 移动端：保存笔记
async function saveMemoFromMobile() {
    if (!mobileVditor) {
        showToast('编辑器未初始化', 'error');
        return;
    }
    
    const content = mobileVditor.getValue().trim();
    
    // 检查输入框中是否有未转换的标签
    const mobileTagsInput = document.getElementById('mobileTagsInput');
    if (mobileTagsInput && mobileTagsInput.value.trim()) {
        const value = mobileTagsInput.value.trim();
        addMobileTag(value);
        mobileTagsInput.value = '';
    }
    
    if (!content) {
        showToast('请输入笔记内容', 'warning');
        return;
    }
    
    try {
        const response = await fetch('api.php?action=memo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content,
                tags: mobileTags,
                visibility: 'private',
                pinned: 0
            })
        });
        
        const result = await response.json();
        
        if (result.data) {
            showToast('发布成功！', 'success');
            
            // 清空编辑器和标签
            mobileVditor.setValue('');
            mobileTags = [];
            renderMobileTags();
            
            // 关闭弹窗
            hideMobilePublishModal();
            
            // 直接在前端插入新文章，避免重新加载接口
            const memoList = document.getElementById('memoList');
            
            // 只在时间流视图且无筛选条件时才插入新文章
            const hasFilters = currentTag || currentDate || currentFilter;
            
            if (memoList && currentView === 'timeline' && !hasFilters) {
                const newMemoCard = createMemoCard(result.data);
                
                // 添加淡入动画
                newMemoCard.style.opacity = '0';
                newMemoCard.style.transform = 'translateY(-20px)';
                
                // 插入到列表顶部
                if (memoList.firstChild) {
                    memoList.insertBefore(newMemoCard, memoList.firstChild);
                } else {
                    memoList.appendChild(newMemoCard);
                }
                
                // 触发动画
                setTimeout(() => {
                    newMemoCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    newMemoCard.style.opacity = '1';
                    newMemoCard.style.transform = 'translateY(0)';
                }, 10);
                
                // 滚动到新文章
                setTimeout(() => {
                    newMemoCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 350);
            } else if (hasFilters) {
                // 有筛选条件时，提示用户可能需要清除筛选才能看到新文章
                showToast('发布成功！清除筛选条件可查看新文章', 'success');
            }
            
            // 只更新标签列表
            loadTags();
            
            // 更新内容筛选器统计
            updateContentFilters();
        }
    } catch (error) {
        console.error('发布失败:', error);
        showToast('发布失败，请重试', 'error');
    }
}

// 加载笔记列表
async function loadMemos(search = '', append = false) {
    if (isLoading) return;
    isLoading = true;
    
    const memoList = document.getElementById('memoList');
    const memoEditor = document.querySelector('.memo-editor');
    
    // 显示编辑器
    if (memoEditor) {
        memoEditor.style.display = 'block';
    }
    
    // 非追加模式时重置总数（新的搜索/筛选）
    if (!append) {
        currentTotalMemos = 0;
    }
    
    if (!append) {
        // 首次加载或搜索时显示加载动画
        memoList.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    } else {
        // 追加加载时显示底部加载动画
        showBottomLoader();
    }
    
    try {
        const itemsPerPage = getItemsPerPage();
        const params = new URLSearchParams({
            page: currentPage,
            limit: itemsPerPage
        });
        
        if (search) params.append('search', search);
        if (currentTag) params.append('tag', currentTag);
        if (currentDate) params.append('date', currentDate);
        if (currentFilter) params.append('filter', currentFilter);
        if (currentSortBy) params.append('sort_by', currentSortBy);
        if (currentSortOrder) params.append('sort_order', currentSortOrder);
        
        const response = await fetch(`api.php?action=memos&${params.toString()}`);
        const result = await response.json();
        
        // 保存总数用于分页
        if (result.total !== undefined) {
            currentTotalMemos = result.total;
        }
        
        if (result.data && result.data.length > 0) {
            if (!append) {
                memoList.innerHTML = '';
            }
            
            // 添加淡入动画
            result.data.forEach((memo, index) => {
                const memoCard = createMemoCard(memo);
                if (append) {
                    // 追加模式：添加淡入动画
                    memoCard.style.opacity = '0';
                    memoCard.style.transform = 'translateY(20px)';
                    memoList.appendChild(memoCard);
                    
                    // 延迟添加动画效果
                    setTimeout(() => {
                        memoCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                        memoCard.style.opacity = '1';
                        memoCard.style.transform = 'translateY(0)';
                    }, index * 50);
                } else {
                    memoList.appendChild(memoCard);
                }
            });
            
            // 检查是否还有更多数据
            const itemsPerPage = getItemsPerPage();
            hasMoreData = result.data.length >= itemsPerPage;
            
            console.log('加载完成，当前页:', currentPage, '数据条数:', result.data.length, '是否还有更多数据:', hasMoreData);
            
            if (!hasMoreData) {
                hideBottomLoader();
                // 显示结束提示
                const endMessage = document.createElement('div');
                endMessage.className = 'memo-card';
                endMessage.style.textAlign = 'center';
                endMessage.style.color = 'var(--text-muted)';
                endMessage.style.marginTop = '20px';
                endMessage.innerHTML = '已加载全部内容';
                memoList.appendChild(endMessage);
            } else if (append) {
                // 如果是追加模式，等待动画完成后检查是否需要继续加载
                setTimeout(() => {
                    checkAndLoadMore();
                }, result.data.length * 50 + 100);
            }
        } else {
            // 无数据时
            hasMoreData = false;
            hideBottomLoader();
            
            if (currentPage === 1) {
                // 第一页无数据，显示空状态
                memoList.innerHTML = `
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                            <path d="M2 2l7.586 7.586"></path>
                            <circle cx="11" cy="11" r="2"></circle>
                        </svg>
                        <p>还没有笔记，开始写第一条吧！</p>
                    </div>
                `;
            } else {
                // 非第一页无数据，显示加载完成提示
                const endMessage = document.createElement('div');
                endMessage.className = 'memo-card';
                endMessage.style.textAlign = 'center';
                endMessage.style.color = 'var(--text-muted)';
                endMessage.style.marginTop = '20px';
                endMessage.innerHTML = '已加载全部内容';
                memoList.appendChild(endMessage);
            }
        }
    } catch (error) {
        console.error('加载笔记失败:', error);
        hasMoreData = false;
        hideBottomLoader();
        
        if (currentPage === 1) {
            memoList.innerHTML = '<div class="empty-state"><p>加载失败，请刷新重试</p></div>';
        }
    } finally {
        isLoading = false;
        if (append) {
            hideBottomLoader();
        }
        
        // 更新内容筛选器统计
        if (!append) {
            updateContentFilters();
        }
        
        // 延迟检查是否需要继续加载（等待DOM更新）
        if (hasMoreData && currentView === 'timeline') {
            setTimeout(() => {
                checkAndLoadMore();
            }, 100);
        }
    }
}

// 为待办事项的复选框启用点击功能
async function enableTodoCheckboxes(card, memo) {
    // 查找所有任务列表项中的复选框
    const checkboxes = card.querySelectorAll('.memo-content input[type="checkbox"]');
    
    checkboxes.forEach((checkbox, index) => {
        // 移除 disabled 属性，使复选框可点击
        checkbox.removeAttribute('disabled');
        
        // 添加点击事件监听器
        checkbox.addEventListener('change', async function(e) {
            e.stopPropagation();
            
            try {
                // 获取原始内容
                const response = await fetch(`api.php?action=memo&id=${memo.id}`);
                const result = await response.json();
                
                if (!result.data) {
                    showToast('获取笔记内容失败', 'error');
                    // 恢复复选框原状态
                    checkbox.checked = !checkbox.checked;
                    return;
                }
                
                const originalContent = result.data.content;
                
                // 找到所有待办事项行
                const lines = originalContent.split('\n');
                let checkboxCount = 0;
                let updatedContent = '';
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    // 匹配待办事项格式：- [ ] 或 - [x] 或 - [X]
                    const todoMatch = line.match(/^(\s*[-*+]\s+)\[([ xX])\](\s+.*)$/);
                    
                    if (todoMatch) {
                        if (checkboxCount === index) {
                            // 找到对应的复选框，切换状态
                            const prefix = todoMatch[1];
                            const suffix = todoMatch[3];
                            const newState = checkbox.checked ? 'x' : ' ';
                            updatedContent += `${prefix}[${newState}]${suffix}\n`;
                        } else {
                            updatedContent += line + '\n';
                        }
                        checkboxCount++;
                    } else {
                        updatedContent += line + '\n';
                    }
                }
                
                // 移除最后一个多余的换行符
                updatedContent = updatedContent.replace(/\n$/, '');
                
                // 保存更新后的内容
                const updateResponse = await fetch(`api.php?action=memo&id=${memo.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        content: updatedContent
                    })
                });
                
                const updateResult = await updateResponse.json();
                
                if (updateResult.data) {
                    // 更新成功后，重新渲染内容
                    const contentDiv = card.querySelector('.memo-content');
                    contentDiv.innerHTML = renderMarkdown(updatedContent);
                    
                    // 重新应用代码高亮
                    if (typeof Prism !== 'undefined') {
                        const codeBlocks = contentDiv.querySelectorAll('pre code');
                        codeBlocks.forEach(block => {
                            Prism.highlightElement(block);
                        });
                    }
                    
                    // 重新为图片和复选框添加事件
                    setTimeout(() => {
                        const memoImages = contentDiv.querySelectorAll('img');
                        memoImages.forEach(img => {
                            img.addEventListener('click', function() {
                                openLightbox(this.src, this.alt);
                            });
                        });
                        
                        // 递归调用，为新渲染的复选框添加事件
                        enableTodoCheckboxes(card, memo);
                    }, 0);
                    
                    // 非移动端才显示提示（移动端屏幕太小，避免占用空间）
                    if (window.innerWidth > 768) {
                        showToast('待办已更新', 'success');
                    }
                    
                    // 更新内容筛选器统计
                    updateContentFilters();
                } else {
                    showToast('更新失败，请重试', 'error');
                    // 恢复复选框原状态
                    checkbox.checked = !checkbox.checked;
                }
            } catch (error) {
                console.error('更新待办事项失败:', error);
                showToast('更新失败，请重试', 'error');
                // 恢复复选框原状态
                checkbox.checked = !checkbox.checked;
            }
        });
    });
}

// 应用文章高度限制
function applyMemoHeightLimit(card) {
    const maxHeight = getMaxMemoHeight();
    if (maxHeight <= 0) return; // 0表示不限制
    
    const memoContent = card.querySelector('.memo-content');
    if (!memoContent) return;
    
    const actualHeight = memoContent.scrollHeight;
    
    // 如果内容高度超过限制
    if (actualHeight > maxHeight) {
        // 添加折叠状态
        card.classList.add('memo-collapsed');
        memoContent.style.maxHeight = maxHeight + 'px';
        memoContent.style.overflow = 'hidden';
        memoContent.style.position = 'relative';
        
        // 创建展开按钮
        const expandBtn = document.createElement('button');
        expandBtn.className = 'memo-expand-btn';
        expandBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            <span>展开全文</span>
        `;
        expandBtn.onclick = () => toggleMemoExpand(card, memoContent, expandBtn, maxHeight);
        
        // 插入展开按钮
        memoContent.parentNode.insertBefore(expandBtn, memoContent.nextSibling);
    }
}

// 切换文章展开/折叠
function toggleMemoExpand(card, memoContent, expandBtn, maxHeight) {
    const isCollapsed = card.classList.contains('memo-collapsed');
    
    if (isCollapsed) {
        // 展开
        card.classList.remove('memo-collapsed');
        card.classList.add('memo-expanded');
        memoContent.style.maxHeight = 'none';
        memoContent.style.overflow = 'visible';
        expandBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
            <span>收起</span>
        `;
    } else {
        // 折叠
        card.classList.add('memo-collapsed');
        card.classList.remove('memo-expanded');
        memoContent.style.maxHeight = maxHeight + 'px';
        memoContent.style.overflow = 'hidden';
        expandBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            <span>展开全文</span>
        `;
        
        // 滚动到卡片顶部
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// 创建笔记卡片
function createMemoCard(memo) {
    const card = document.createElement('div');
    card.className = 'memo-card' + (memo.pinned == 1 ? ' pinned' : '');
    card.dataset.id = memo.id;
    
    // 解析 Markdown
    let contentHtml;
    if (typeof marked !== 'undefined') {
        try {
            contentHtml = marked.parse(memo.content);
            console.log('Markdown解析成功');
        } catch (error) {
            console.error('Markdown解析失败:', error);
            contentHtml = memo.content.replace(/\n/g, '<br>');
        }
    } else {
        contentHtml = memo.content.replace(/\n/g, '<br>');
    }
    
    // 构建标签 HTML
    const tagsHtml = memo.tags && memo.tags.length > 0
        ? `<div class="memo-tags">
            ${memo.tags.map(tag => `<span class="memo-tag">#${tag.name}</span>`).join('')}
           </div>`
        : '';
    
    // 构建附件 HTML
    let attachmentsHtml = '';
    if (memo.attachments && memo.attachments.length > 0) {
        attachmentsHtml = '<div class="memo-attachments">';
        memo.attachments.forEach(att => {
            if (att.file_type && att.file_type.startsWith('image/')) {
                attachmentsHtml += `
                    <img src="${att.url}" alt="${att.original_name}" 
                         class="attachment-thumbnail" 
                         onclick="openLightbox('${att.url}', '${att.original_name}')">
                `;
            } else {
                attachmentsHtml += `
                    <a href="${att.url}" class="attachment-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M13.234 20.252 21 12.3"></path>
                            <path d="m16 6-8.414 8.586a2 2 0 0 0 0 2.828 2 2 0 0 0 2.828 0l8.414-8.586a4 4 0 0 0 0-5.656 4 4 0 0 0-5.656 0l-8.415 8.585a6 6 0 1 0 8.486 8.486"></path>
                        </svg>
                        <span>${att.original_name}</span>
                    </a>
                `;
            }
        });
        attachmentsHtml += '</div>';
    }
    
    card.innerHTML = `
        <div class="memo-header">
            <span class="memo-time">${formatTime(memo.created_at)}</span>
            <div class="memo-actions">
                ${memo.pinned == 1 
                    ? `<button class="memo-action-btn" onclick="unpinMemo(${memo.id})" title="取消置顶">
                        <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="17" x2="12" y2="22"></line>
                            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
                        </svg>
                       </button>`
                    : `<button class="memo-action-btn" onclick="pinMemo(${memo.id})" title="置顶">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="17" x2="12" y2="22"></line>
                            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
                        </svg>
                       </button>`
                }
                <button class="memo-action-btn" onclick="editInPlace(${memo.id})" title="编辑">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                    </svg>
                </button>
                <button class="memo-action-btn" onclick="deleteMemo(${memo.id})" title="删除">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
                <div class="memo-more-menu">
                    <button class="memo-action-btn memo-more-btn" onclick="toggleMoreMenu(${memo.id})" title="更多">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="19" cy="12" r="1"></circle>
                            <circle cx="5" cy="12" r="1"></circle>
                        </svg>
                    </button>
                    <div class="more-dropdown" id="more-dropdown-${memo.id}">
                        <button class="more-item" onclick="copyMemoContent(${memo.id})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            复制
                        </button>
                        <button class="more-item" onclick="exportMemoAsMarkdown(${memo.id})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7,10 12,15 17,10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            导出
                        </button>
                        <button class="more-item" onclick="shareMemo(${memo.id})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="18" cy="5" r="3"></circle>
                                <circle cx="6" cy="12" r="3"></circle>
                                <circle cx="18" cy="19" r="3"></circle>
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                            </svg>
                            分享
                        </button>
                    </div>
                </div>
            </div>
        </div>
        ${tagsHtml}
        <div class="memo-content">${contentHtml}</div>
        ${attachmentsHtml}
    `;
    
    // 为Markdown渲染的图片添加点击事件
    setTimeout(() => {
        const memoImages = card.querySelectorAll('.memo-content img');
        memoImages.forEach(img => {
            img.addEventListener('click', function() {
                openLightbox(this.src, this.alt);
            });
        });
        
        // 为代码块添加复制按钮
        addCopyButtonsToCodeBlocks(card);
        
        // 重新应用代码高亮到整个卡片
        if (typeof Prism !== 'undefined') {
            const codeBlocks = card.querySelectorAll('pre code');
            codeBlocks.forEach(block => {
                // 重新高亮
                Prism.highlightElement(block);
            });
        }
        
        // 为待办事项的复选框添加点击事件
        enableTodoCheckboxes(card, memo);
        
        // 检测并应用高度限制
        applyMemoHeightLimit(card);
    }, 0);
    
    return card;
}

// 切换排序下拉框显示/隐藏
function toggleSortDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('sortDropdown');
    if (dropdown) {
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
        
        // 更新选中状态
        updateSortSelection();
    }
}

// 更新排序选项的选中状态
function updateSortSelection() {
    const dropdown = document.getElementById('sortDropdown');
    if (!dropdown) return;
    
    const options = dropdown.querySelectorAll('.sort-option');
    options.forEach(option => {
        const sortBy = option.getAttribute('onclick').match(/'([^']+)'/g)[0].replace(/'/g, '');
        const sortOrder = option.getAttribute('onclick').match(/'([^']+)'/g)[1].replace(/'/g, '');
        
        if (sortBy === currentSortBy && sortOrder === currentSortOrder) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
}

// 改变排序顺序
function changeSortOrder(sortBy, sortOrder) {
    currentSortBy = sortBy;
    currentSortOrder = sortOrder;
    
    // 关闭下拉框
    const dropdown = document.getElementById('sortDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
    
    // 重新加载笔记
    currentPage = 1;
    hasMoreData = true;
    
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    loadMemos(searchTerm, false);
    
    showToast(`已切换排序：${getSortDisplayName(sortBy, sortOrder)}`, 'success');
}

// 获取排序显示名称
function getSortDisplayName(sortBy, sortOrder) {
    const sortNames = {
        'created_at': '创建时间',
        'updated_at': '修改时间'
    };
    const orderNames = {
        'ASC': '升序',
        'DESC': '降序'
    };
    return `${sortNames[sortBy] || sortBy}${orderNames[sortOrder] || sortOrder}`;
}

// 保存笔记
async function saveMemo() {
    if (!publishVditor) {
        showToast('编辑器未初始化', 'error');
        return;
    }
    
    const content = publishVditor.getValue().trim();
    
    // 检查输入框中是否有未转换的标签
    const memoTagsInput = document.getElementById('memoTagsInput');
    if (memoTagsInput) {
        const pendingTag = memoTagsInput.value.trim();
        if (pendingTag) {
            addTag(pendingTag);
            memoTagsInput.value = '';
        }
    }
    
    const tags = getTagsString();
    
    if (!content) {
        showToast('请输入笔记内容', 'warning');
        return;
    }
    
    try {
        const response = await fetch('api.php?action=memo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content,
                tags: tags
            })
        });
        
        const result = await response.json();
        
        if (result.data) {
            // 清空输入框
            publishVditor.setValue('');
            clearTags();
            
            // 直接在前端插入新文章，避免重新加载接口
            const memoList = document.getElementById('memoList');
            
            // 只在时间流视图且无筛选条件时才插入新文章
            const hasFilters = currentTag || currentDate || currentFilter;
            
            if (memoList && currentView === 'timeline' && !hasFilters) {
                const newMemoCard = createMemoCard(result.data);
                
                // 添加淡入动画
                newMemoCard.style.opacity = '0';
                newMemoCard.style.transform = 'translateY(-20px)';
                
                // 插入到列表顶部
                if (memoList.firstChild) {
                    memoList.insertBefore(newMemoCard, memoList.firstChild);
                } else {
                    memoList.appendChild(newMemoCard);
                }
                
                // 触发动画
                setTimeout(() => {
                    newMemoCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    newMemoCard.style.opacity = '1';
                    newMemoCard.style.transform = 'translateY(0)';
                }, 10);
                
                // 滚动到新文章
                setTimeout(() => {
                    newMemoCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 350);
            } else if (hasFilters) {
                // 有筛选条件时，提示用户可能需要清除筛选才能看到新文章
                showToast('发布成功！清除筛选条件可查看新文章', 'success');
            }
            
            // 只更新标签列表
            loadTags();
            
            // 更新内容筛选器统计
            updateContentFilters();
        }
    } catch (error) {
        console.error('保存笔记失败:', error);
        showToast('保存失败，请重试', 'error');
    }
}

// 删除笔记
async function deleteMemo(id) {
    if (!confirm('确定要删除这条笔记吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`api.php?action=memo&id=${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 从 DOM 中移除
            const card = document.querySelector(`.memo-card[data-id="${id}"]`);
            if (card) {
                card.remove();
            }
            
            // 重新加载标签列表（会自动清理空标签）
            loadTags();
            
            // 更新内容筛选器统计
            updateContentFilters();
        }
    } catch (error) {
        console.error('删除笔记失败:', error);
        showToast('删除失败，请重试', 'error');
    }
}

// 置顶笔记
async function pinMemo(id) {
    try {
        const response = await fetch(`api.php?action=memo&id=${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pinned: 1 })
        });
        
        const result = await response.json();
        
        if (result.data) {
            currentPage = 1;
            hasMoreData = true;
            loadMemos('', false);
        }
    } catch (error) {
        console.error('置顶失败:', error);
    }
}

// 取消置顶
async function unpinMemo(id) {
    try {
        const response = await fetch(`api.php?action=memo&id=${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pinned: 0 })
        });
        
        const result = await response.json();
        
        if (result.data) {
            currentPage = 1;
            hasMoreData = true;
            loadMemos('', false);
        }
    } catch (error) {
        console.error('取消置顶失败:', error);
    }
}

// 编辑笔记 - 加载到发布框（已弃用，使用 editInPlace 代替）
async function editMemo(id) {
    try {
        const response = await fetch(`api.php?action=memo&id=${id}`);
        const result = await response.json();
        
        if (result.data) {
            const memo = result.data;
            if (publishVditor) {
                publishVditor.setValue(memo.content);
            }
            
            // 设置标签
            currentTags = memo.tags.map(t => t.name);
            renderTags();
            
            // 滚动到编辑器
            const editorEl = document.getElementById('vditorPublish');
            if (editorEl) {
                editorEl.scrollIntoView({ behavior: 'smooth' });
            }
        }
    } catch (error) {
        console.error('加载笔记失败:', error);
    }
}

// 富文本编辑 - 在原地编辑
async function editInPlace(id) {
    try {
        const card = document.querySelector(`.memo-card[data-id="${id}"]`);
        const contentDiv = card.querySelector('.memo-content');
        
        // 检查是否已经在编辑模式
        if (card.dataset.editing === 'true') {
            // 如果已经在编辑模式，取消编辑
            cancelEditInPlace(id);
            return;
        }
        
        const response = await fetch(`api.php?action=memo&id=${id}`);
        const result = await response.json();
        
        if (result.data) {
            const memo = result.data;
            
            // 保存原始内容到 dataset
            const originalContent = contentDiv.innerHTML;
            card.dataset.originalContent = originalContent;
            card.dataset.editing = 'true';
            
            // 创建编辑容器
            contentDiv.innerHTML = `
                <div class="vditor-container" style="margin-bottom: 10px;">
                    <div id="vditor-${id}"></div>
                </div>
                <div class="edit-actions" style="display: flex; gap: 8px; margin-top: 10px;">
                    <button onclick="saveEditInPlace('${id}')" class="btn-save" style="background: var(--primary-color); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">保存</button>
                    <button onclick="cancelEditInPlace('${id}')" class="btn-cancel" style="background: var(--border-color); border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">取消</button>
                </div>
            `;
            
            // 初始化 Vditor
            if (typeof Vditor !== 'undefined') {
                const vditorInstance = new Vditor(`vditor-${id}`, {
                    height: 400, // 增加高度到400px
                    mode: 'ir', // 即时渲染模式
                    value: memo.content,
                    placeholder: '编辑笔记内容...',
                    hint: {
                        emoji: getEmojiConfig()
                    },
                    toolbar: [
                        'emoji',
                        'headings',
                        'bold',
                        'italic',
                        'strike',
                        'link',
                        '|',
                        'list',
                        'ordered-list',
                        'check',
                        'outdent',
                        'indent',
                        '|',
                        'quote',
                        'line',
                        'code',
                        'inline-code',
                        '|',
                        'table',
                        '|',
                        'undo',
                        'redo',
                        '|',
                        'edit-mode',
                        'both',
                        'preview',
                        'fullscreen'
                    ],
                    upload: {
                        url: 'api.php?action=upload',
                        fieldName: 'file',
                        max: 10 * 1024 * 1024, // 10MB
                        format(files, responseText) {
                            const response = JSON.parse(responseText);
                            if (response.data && response.data.url) {
                                return JSON.stringify({
                                    msg: '',
                                    code: 0,
                                    data: {
                                        errFiles: [],
                                        succMap: {
                                            [files[0].name]: response.data.url
                                        }
                                    }
                                });
                            }
                            return responseText;
                        }
                    },
                    preview: {
                        markdown: {
                            toc: true,
                            mark: true,
                            footnotes: true,
                            autoSpace: true
                        }
                    },
                    counter: {
                        enable: true,
                        type: 'text'
                    },
                    cache: {
                        enable: false
                    }
                });
                
                // 将 Vditor 实例存储到 DOM 元素中
                const vditorElement = document.getElementById(`vditor-${id}`);
                if (vditorElement) {
                    vditorElement.vditor = vditorInstance;
                }
            } else {
                // 如果 Vditor 未加载，使用普通 textarea
                const vditorDiv = document.getElementById(`vditor-${id}`);
                vditorDiv.innerHTML = `<textarea id="vditor-textarea-${id}" style="width: 100%; height: 400px; border: 1px solid var(--border-color); border-radius: 4px; padding: 8px; resize: vertical;">${memo.content}</textarea>`;
            }
        }
    } catch (error) {
        console.error('富文本编辑失败:', error);
    }
}

// 保存富文本编辑
async function saveEditInPlace(id) {
    try {
        const card = document.querySelector(`.memo-card[data-id="${id}"]`);
        let content = '';
        
        // 获取编辑后的内容
        if (typeof Vditor !== 'undefined') {
            const vditorElement = document.querySelector(`#vditor-${id}`);
            if (vditorElement && vditorElement.vditor) {
                content = vditorElement.vditor.getValue();
                console.log('Vditor content retrieved via getValue():', content);
            } else {
                console.log('Vditor element not found or vditor not initialized');
                // 尝试从 Vditor 的内容区域获取文本
                const vditorContent = document.querySelector(`#vditor-${id} .vditor-ir`) || 
                                    document.querySelector(`#vditor-${id} .vditor-reset`) ||
                                    document.querySelector(`#vditor-${id} .vditor-content`);
                if (vditorContent) {
                    content = vditorContent.innerText || vditorContent.textContent || '';
                    console.log('Fallback Vditor content from content area:', content);
                } else {
                    console.log('No Vditor content area found');
                }
            }
        } else {
            const textarea = document.getElementById(`vditor-textarea-${id}`);
            if (textarea) {
                content = textarea.value;
                console.log('Textarea content retrieved:', content);
            } else {
                console.log('Textarea element not found');
            }
        }
        
        console.log('Content before trim:', content);
        console.log('Content after trim:', content.trim());
        
        if (!content.trim()) {
            showToast('请输入笔记内容', 'warning');
            return;
        }
        
        // 更新笔记
        const response = await fetch(`api.php?action=memo&id=${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content
            })
        });
        
        const result = await response.json();
        
        if (result.data) {
            // 重新渲染内容
            const contentDiv = card.querySelector('.memo-content');
            contentDiv.innerHTML = renderMarkdown(content);
            
            // 重新应用代码高亮
            if (typeof Prism !== 'undefined') {
                const codeBlocks = contentDiv.querySelectorAll('pre code');
                codeBlocks.forEach(block => {
                    Prism.highlightElement(block);
                });
            }
            
            // 重新添加图片点击事件
            const memoImages = contentDiv.querySelectorAll('img');
            memoImages.forEach(img => {
                img.addEventListener('click', function() {
                    openLightbox(this.src, this.alt);
                });
            });
            
            // 重新添加代码块复制按钮
            addCopyButtonsToCodeBlocks(card);
            
            // 清理存储的原始内容和编辑状态
            delete card.dataset.originalContent;
            delete card.dataset.editing;
        }
    } catch (error) {
        console.error('保存编辑失败:', error);
        showToast('保存失败，请重试', 'error');
    }
}

// 取消富文本编辑
function cancelEditInPlace(id) {
    const card = document.querySelector(`.memo-card[data-id="${id}"]`);
    const contentDiv = card.querySelector('.memo-content');
    const originalContent = card.dataset.originalContent;
    contentDiv.innerHTML = originalContent;
    
    // 清理存储的原始内容和编辑状态
    delete card.dataset.originalContent;
    delete card.dataset.editing;
}

// 加载标签列表
async function loadTags() {
    try {
        const response = await fetch('api.php?action=tags');
        const result = await response.json();
        
        const tagList = document.getElementById('tagList');
        
        if (result.data && result.data.length > 0) {
            tagList.innerHTML = result.data.map(tag => `
                <div class="tag-item ${currentTag === tag.name ? 'active' : ''}" 
                     onclick="filterByTag('${tag.name}')">
                    #${tag.name}
                    <span class="tag-count">${tag.count}</span>
                </div>
            `).join('');
        } else {
            tagList.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">暂无标签</p>';
        }
    } catch (error) {
        console.error('加载标签失败:', error);
    }
}

// 按标签筛选
function filterByTag(tag) {
    if (currentTag === tag) {
        currentTag = '';
    } else {
        currentTag = tag;
    }
    
    currentPage = 1;
    hasMoreData = true;
    loadMemos('', false);
    loadTags();
}

// 切换内容筛选器
function toggleFilter(filterType) {
    // 切换筛选器状态
    if (currentFilter === filterType) {
        currentFilter = '';
    } else {
        currentFilter = filterType;
    }
    
    // 更新按钮激活状态
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (currentFilter) {
        const activeBtn = document.getElementById(`filter${filterType.charAt(0).toUpperCase() + filterType.slice(1)}`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }
    
    // 重置页码并重新加载
    currentPage = 1;
    hasMoreData = true;
    loadMemos('', false);
}

// 更新内容筛选器统计
async function updateContentFilters() {
    try {
        // 获取所有笔记进行统计
        const response = await fetch('api.php?action=memos&limit=10000');
        const result = await response.json();
        
        if (!result.data) return;
        
        let pinnedCount = 0;
        let linksCount = 0;
        let todoCompleted = 0;
        let todoTotal = 0;
        let codeCount = 0;
        
        result.data.forEach(memo => {
            // 统计置顶
            if (memo.pinned == 1) {
                pinnedCount++;
            }
            
            // 统计链接（不包括图片链接）
            // 使用负向后顾断言排除 ![alt](url) 格式的图片链接
            const linkRegex = /(?<!!)\[([^\]]*)\]\(([^)]+)\)/g;
            if (linkRegex.test(memo.content)) {
                linksCount++;
            }
            
            // 统计待办事项（按文章数，不是任务数）
            const todoRegex = /^(\s*[-*+]\s+)\[([ xX])\]/gm;
            const todoMatches = memo.content.match(todoRegex);
            if (todoMatches && todoMatches.length > 0) {
                // 这篇文章包含待办事项
                todoTotal++;
                
                // 检查是否所有待办事项都已完成
                const uncompletedMatches = memo.content.match(/^(\s*[-*+]\s+)\[ \]/gm);
                if (!uncompletedMatches || uncompletedMatches.length === 0) {
                    // 没有未完成的待办事项，说明全部完成
                    todoCompleted++;
                }
            }
            
            // 统计代码块
            const codeBlockRegex = /```[\s\S]*?```|`[^`]+`/g;
            if (codeBlockRegex.test(memo.content)) {
                codeCount++;
            }
        });
        
        // 更新UI
        const pinnedCountEl = document.getElementById('pinnedCount');
        const linksCountEl = document.getElementById('linksCount');
        const todoCompletedEl = document.getElementById('todoCompleted');
        const todoTotalEl = document.getElementById('todoTotal');
        const codeCountEl = document.getElementById('codeCount');
        
        if (pinnedCountEl) pinnedCountEl.textContent = pinnedCount;
        if (linksCountEl) linksCountEl.textContent = linksCount;
        if (todoCompletedEl) todoCompletedEl.textContent = todoCompleted;
        if (todoTotalEl) todoTotalEl.textContent = todoTotal;
        if (codeCountEl) codeCountEl.textContent = codeCount;
        
    } catch (error) {
        console.error('更新内容筛选器统计失败:', error);
    }
}

// 上传图片到发布区
async function uploadImageToPublish(input) {
    const file = input.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('api.php?action=upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.data) {
            // 插入到 Vditor
            if (publishVditor) {
                const markdown = `![${result.data.original_name}](${result.data.url})`;
                publishVditor.insertValue(markdown);
            }
        }
    } catch (error) {
        console.error('上传图片失败:', error);
        showToast('上传失败，请重试', 'error');
    }
    
    input.value = '';
}

// 上传附件到发布区
async function uploadFileToPublish(input) {
    const file = input.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('api.php?action=upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.data) {
            // 插入到 Vditor
            if (publishVditor) {
                const markdown = `[${result.data.original_name}](${result.data.url})`;
                publishVditor.insertValue(markdown);
            }
        }
    } catch (error) {
        console.error('上传文件失败:', error);
        showToast('上传失败，请重试', 'error');
    }
    
    input.value = '';
}

// 插入 Markdown 语法
function insertMarkdown(before, after) {
    const textarea = document.getElementById('memoContent');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const replacement = before + selectedText + after;
    
    textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
    
    // 设置光标位置
    if (selectedText) {
        textarea.setSelectionRange(start, start + replacement.length);
    } else {
        textarea.setSelectionRange(start + before.length, start + before.length);
    }
    
    textarea.focus();
}

// 在光标位置插入文本
function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    textarea.value = textarea.value.substring(0, start) + text + textarea.value.substring(end);
    textarea.setSelectionRange(start + text.length, start + text.length);
    textarea.focus();
}

// 插入 checkbox
function insertCheckbox() {
    const textarea = document.getElementById('memoContent');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    // 检查光标位置是否在行首
    const textBeforeCursor = textarea.value.substring(0, start);
    const isAtLineStart = textBeforeCursor === '' || textBeforeCursor.endsWith('\n');
    
    const checkbox = '- [ ] ';
    let replacement;
    
    if (isAtLineStart) {
        // 如果在行首，直接插入checkbox
        replacement = checkbox + selectedText;
    } else {
        // 如果不在行首，先换行再插入checkbox
        replacement = '\n' + checkbox + selectedText;
    }
    
    textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
    
    // 设置光标位置
    if (selectedText) {
        textarea.setSelectionRange(start + replacement.length - textarea.value.substring(end).length, start + replacement.length);
    } else {
        textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }
    
    textarea.focus();
}


// 设置无限滚动
function setupInfiniteScroll() {
    const memoList = document.getElementById('memoList');
    if (!memoList) return;
    
    // 创建底部加载器
    const bottomLoader = document.createElement('div');
    bottomLoader.id = 'bottomLoader';
    bottomLoader.className = 'bottom-loader';
    bottomLoader.innerHTML = `
        <div class="loader-content">
            <div class="loader-spinner"></div>
            <span>加载更多...</span>
        </div>
    `;
    bottomLoader.style.display = 'none';
    memoList.appendChild(bottomLoader);
    
    // 监听滚动事件（减少节流时间以提高响应速度）
    window.addEventListener('scroll', throttle(handleScroll, 100));
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// 处理滚动事件
function handleScroll() {
    if (isLoading || !hasMoreData || currentView !== 'timeline') return;
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // 当滚动到距离底部200px时触发加载（提前触发）
    if (scrollTop + windowHeight >= documentHeight - 200) {
        console.log('触发无限滚动加载，当前页:', currentPage, '是否还有更多数据:', hasMoreData);
        loadMoreMemos();
    }
}

// 检查并自动加载更多（如果内容不足以填满屏幕）
function checkAndLoadMore() {
    if (isLoading || !hasMoreData || currentView !== 'timeline') return;
    
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // 如果页面高度不够，还没有出现滚动条，或者已经接近底部，自动加载更多
    if (documentHeight <= windowHeight || scrollTop + windowHeight >= documentHeight - 200) {
        console.log('内容不足，自动加载更多，当前页:', currentPage);
        loadMoreMemos();
    }
}

// 显示底部加载器
function showBottomLoader() {
    const bottomLoader = document.getElementById('bottomLoader');
    if (bottomLoader) {
        bottomLoader.style.display = 'block';
    }
}

// 隐藏底部加载器
function hideBottomLoader() {
    const bottomLoader = document.getElementById('bottomLoader');
    if (bottomLoader) {
        bottomLoader.style.display = 'none';
    }
}

// 加载更多笔记
function loadMoreMemos() {
    if (isLoading || !hasMoreData) return;
    currentPage++;
    loadMemos('', true); // append = true
}

// 初始化日历
function initCalendar() {
    const calendar = document.getElementById('calendar');
    const now = new Date();
    
    // 更新当前显示的月份和年份
    currentCalendarYear = now.getFullYear();
    currentCalendarMonth = now.getMonth();
    
    let html = '<div class="calendar-header">';
    html += '<button onclick="changeMonth(-1)" class="calendar-nav-btn">‹</button>';
    html += '<div class="calendar-title" onclick="showMonthYearPicker()">';
    html += `<span>${currentCalendarYear}年${currentCalendarMonth + 1}月</span>`;
    html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="calendar-dropdown-icon">';
    html += '<polyline points="6,9 12,15 18,9"></polyline>';
    html += '</svg>';
    html += '</div>';
    html += '<button onclick="changeMonth(1)" class="calendar-nav-btn">›</button>';
    html += '</div>';
    
    // 年月选择器
    html += '<div id="monthYearPicker" class="month-year-picker" style="display: none;">';
    html += '<div class="picker-content">';
    html += '<div class="year-picker">';
    html += '<button onclick="changeYear(-1)">‹</button>';
    html += `<span id="currentYear">${currentCalendarYear}</span>`;
    html += '<button onclick="changeYear(1)">›</button>';
    html += '</div>';
    html += '<div class="month-grid">';
    for (let month = 0; month < 12; month++) {
        const isCurrentMonth = month === currentCalendarMonth;
        html += `<div class="month-item ${isCurrentMonth ? 'active' : ''}" onclick="selectMonth(${month})">${month + 1}月</div>`;
    }
    html += '</div>';
    html += '</div>';
    html += '</div>';
    
    html += '<div class="calendar-grid">';
    
    // 星期标题
    const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
    weekDays.forEach(day => {
        html += `<div class="calendar-day" style="font-weight: 600; opacity: 0.6;">${day}</div>`;
    });
    
    // 生成日历日期
    html += generateCalendarDays();
    
    html += '</div>';
    calendar.innerHTML = html;
    
    // 加载每日笔记数量
    loadDailyMemoCounts();
}

// 按日期筛选
function filterByDate(date) {
    // 如果点击的是已选中的日期，则取消选择
    if (selectedDate === date) {
        selectedDate = '';
        currentDate = '';
    } else {
        selectedDate = date;
        currentDate = date;
    }
    
    currentPage = 1;
    hasMoreData = true;
    
    // 重新生成日历以更新选中状态
    updateCalendar();
    
    // 加载对应日期的笔记
    loadMemos('', false);
}

// 生成日历日期
function generateCalendarDays() {
    const firstDay = new Date(currentCalendarYear, currentCalendarMonth, 1);
    const lastDay = new Date(currentCalendarYear, currentCalendarMonth + 1, 0);
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === currentCalendarYear && today.getMonth() === currentCalendarMonth;
    
    let html = '';
    
    // 填充空白
    for (let i = 0; i < startDay; i++) {
        html += '<div class="calendar-day"></div>';
    }
    
    // 填充日期
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = `${currentCalendarYear}-${String(currentCalendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = isCurrentMonth && day === today.getDate();
        const isSelected = selectedDate === date;
        const memoCount = dailyMemoCounts[date] || 0;
        const dotIntensity = getDotIntensity(memoCount);
        
        html += `<div class="calendar-day ${isToday ? 'active' : ''} ${isSelected ? 'selected' : ''}" onclick="filterByDate('${date}')">`;
        html += `<span class="day-number">${day}</span>`;
        if (memoCount > 0) {
            html += `<div class="day-dot" style="background-color: ${dotIntensity};"></div>`;
        }
        html += '</div>';
    }
    
    return html;
}

// 获取圆点颜色强度
function getDotIntensity(count) {
    if (count === 0) return 'transparent';
    if (count === 1) return 'rgba(102, 126, 234, 0.3)';
    if (count <= 3) return 'rgba(102, 126, 234, 0.5)';
    if (count <= 5) return 'rgba(102, 126, 234, 0.7)';
    return 'rgba(102, 126, 234, 0.9)';
}

// 加载每日笔记数量
async function loadDailyMemoCounts() {
    try {
        const response = await fetch('api.php?action=stats');
        const result = await response.json();
        
        if (result.data && result.data.daily_stats) {
            dailyMemoCounts = {};
            result.data.daily_stats.forEach(stat => {
                dailyMemoCounts[stat.date] = stat.count;
            });
            
            // 重新生成日历日期以显示圆点
            const calendar = document.getElementById('calendar');
            const calendarGrid = calendar.querySelector('.calendar-grid');
            if (calendarGrid) {
                // 保留星期标题（前7个元素）
                const weekTitles = [];
                for (let i = 0; i < 7; i++) {
                    if (calendarGrid.children[i]) {
                        weekTitles.push(calendarGrid.children[i].cloneNode(true));
                    }
                }
                
                // 清空整个网格
                calendarGrid.innerHTML = '';
                
                // 重新添加星期标题
                weekTitles.forEach(title => {
                    calendarGrid.appendChild(title);
                });
                
                // 重新生成并添加日期部分
                const newDaysHtml = generateCalendarDays();
                const newDaysContainer = document.createElement('div');
                newDaysContainer.innerHTML = newDaysHtml;
                const newDays = Array.from(newDaysContainer.children);
                
                // 添加新的日期
                newDays.forEach(day => {
                    calendarGrid.appendChild(day);
                });
            }
        }
    } catch (error) {
        console.error('加载每日笔记数量失败:', error);
    }
}

// 显示年月选择器
function showMonthYearPicker() {
    const picker = document.getElementById('monthYearPicker');
    if (picker) {
        picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
    }
}

// 切换月份
function changeMonth(offset) {
    currentCalendarMonth += offset;
    
    if (currentCalendarMonth < 0) {
        currentCalendarMonth = 11;
        currentCalendarYear--;
    } else if (currentCalendarMonth > 11) {
        currentCalendarMonth = 0;
        currentCalendarYear++;
    }
    
    updateCalendar();
}

// 切换年份
function changeYear(offset) {
    currentCalendarYear += offset;
    updateCalendar();
}

// 选择月份
function selectMonth(month) {
    currentCalendarMonth = month;
    updateCalendar();
    hideMonthYearPicker();
}

// 更新日历显示
function updateCalendar() {
    const calendar = document.getElementById('calendar');
    const title = calendar.querySelector('.calendar-title span');
    const yearSpan = document.getElementById('currentYear');
    
    if (title) {
        title.textContent = `${currentCalendarYear}年${currentCalendarMonth + 1}月`;
    }
    if (yearSpan) {
        yearSpan.textContent = currentCalendarYear;
    }
    
    // 更新月份选择器中的活动状态
    const monthItems = calendar.querySelectorAll('.month-item');
    monthItems.forEach((item, index) => {
        item.classList.toggle('active', index === currentCalendarMonth);
    });
    
    // 重新生成日期
    const calendarGrid = calendar.querySelector('.calendar-grid');
    if (calendarGrid) {
        // 保留星期标题（前7个元素）
        const weekTitles = [];
        for (let i = 0; i < 7; i++) {
            if (calendarGrid.children[i]) {
                weekTitles.push(calendarGrid.children[i].cloneNode(true));
            }
        }
        
        // 清空整个网格
        calendarGrid.innerHTML = '';
        
        // 重新添加星期标题
        weekTitles.forEach(title => {
            calendarGrid.appendChild(title);
        });
        
        // 重新生成并添加日期部分
        const newDaysHtml = generateCalendarDays();
        const newDaysContainer = document.createElement('div');
        newDaysContainer.innerHTML = newDaysHtml;
        const newDays = Array.from(newDaysContainer.children);
        
        // 添加新的日期
        newDays.forEach(day => {
            calendarGrid.appendChild(day);
        });
    }
}

// 隐藏年月选择器
function hideMonthYearPicker() {
    const picker = document.getElementById('monthYearPicker');
    if (picker) {
        picker.style.display = 'none';
    }
}

// 设置点击外部关闭年月选择器
function setupCalendarClickOutside() {
    document.addEventListener('click', function(event) {
        const calendar = document.getElementById('calendar');
        const picker = document.getElementById('monthYearPicker');
        
        if (calendar && picker && picker.style.display === 'block') {
            if (!calendar.contains(event.target)) {
                hideMonthYearPicker();
            }
        }
    });
}

// 获取附件搜索区域HTML
function getAttachmentSearchHtml(searchTerm = '', fileType = 'all') {
    return `
        <div class="attachment-search-container">
            <select id="attachmentTypeFilter" class="attachment-type-filter" onchange="searchAttachments()">
                <option value="all" ${fileType === 'all' ? 'selected' : ''}>全部</option>
                <option value="image" ${fileType === 'image' ? 'selected' : ''}>图片</option>
                <option value="text" ${fileType === 'text' ? 'selected' : ''}>文本</option>
                <option value="document" ${fileType === 'document' ? 'selected' : ''}>文档</option>
                <option value="archive" ${fileType === 'archive' ? 'selected' : ''}>压缩包</option>
                <option value="other" ${fileType === 'other' ? 'selected' : ''}>其它</option>
            </select>
            <div class="attachment-search-box">
                <input type="text" id="attachmentSearchInput" placeholder="搜索附件名..." value="${searchTerm}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" onclick="searchAttachments()">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.3-4.3"></path>
                </svg>
            </div>
            <div class="attachment-view-toggle">
                <button class="view-toggle-btn ${attachmentViewMode === 'grid' ? 'active' : ''}" onclick="switchAttachmentView('grid')" title="平铺模式">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                </button>
                <button class="view-toggle-btn ${attachmentViewMode === 'list' ? 'active' : ''}" onclick="switchAttachmentView('list')" title="列表模式">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="8" y1="6" x2="21" y2="6"></line>
                        <line x1="8" y1="12" x2="21" y2="12"></line>
                        <line x1="8" y1="18" x2="21" y2="18"></line>
                        <line x1="3" y1="6" x2="3.01" y2="6"></line>
                        <line x1="3" y1="12" x2="3.01" y2="12"></line>
                        <line x1="3" y1="18" x2="3.01" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

// 加载附件列表
async function loadAttachments(searchTerm = '', fileType = 'all', page = 1) {
    const memoList = document.getElementById('memoList');
    const loadMore = document.querySelector('.load-more');
    const memoEditor = document.querySelector('.memo-editor');
    
    attachmentPage = page;
    
    // 隐藏加载更多按钮和编辑器
    if (loadMore) {
        loadMore.style.display = 'none';
    }
    if (memoEditor) {
        memoEditor.style.display = 'none';
    }
    
    // 添加附件搜索框
    memoList.innerHTML = getAttachmentSearchHtml(searchTerm, fileType) + '<div class="loading"><div class="spinner"></div></div>';
    
    try {
        const params = new URLSearchParams({
            page: page,
            limit: attachmentPerPage
        });
        if (searchTerm) params.append('search', searchTerm);
        
        const url = `api.php?action=attachments&${params.toString()}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.data && result.data.length > 0) {
            // 根据文件类型筛选（注意：筛选后total可能不准确，但这是客户端筛选的权衡）
            let filteredData = result.data;
            let actualTotal = result.total || result.data.length;
            
            if (fileType !== 'all') {
                filteredData = result.data.filter(att => matchFileType(att.original_name, att.file_type, fileType));
                // 如果进行了客户端筛选，total可能不准确，使用当前筛选后的数量
                if (filteredData.length < result.data.length) {
                    actualTotal = filteredData.length;
                }
            }
            
            let html = '';
            
            // 根据视图模式生成不同的HTML
            if (attachmentViewMode === 'list') {
                // 列表模式
                html = '<div class="attachment-list">';
                filteredData.forEach(att => {
                    const isImage = att.file_type && att.file_type.startsWith('image/');
                    html += `
                        <div class="attachment-list-item">
                            <div class="attachment-list-icon">
                                ${isImage ? `<img src="${att.url}" alt="${att.original_name}" class="attachment-list-thumbnail">` : `
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M13.234 20.252 21 12.3"></path>
                                    <path d="m16 6-8.414 8.586a2 2 0 0 0 0 2.828 2 2 0 0 0 2.828 0l8.414-8.586a4 4 0 0 0 0-5.656 4 4 0 0 0-5.656 0l-8.415 8.585a6 6 0 1 0 8.486 8.486"></path>
                                </svg>
                                `}
                            </div>
                            <div class="attachment-list-info" onclick="${isImage ? `previewAttachmentImage('${att.url}', '${att.original_name.replace(/'/g, "\\'")}'  )` : `window.location.href='${att.url}'`}" style="cursor: pointer;">
                                <div class="attachment-list-name">${att.original_name}</div>
                                <div class="attachment-list-meta">${formatFileSize(att.file_size || 0)}</div>
                            </div>
                            <div class="attachment-list-actions">
                                ${isImage ? `
                                <button class="attachment-list-btn" onclick="previewAttachmentImage('${att.url}', '${att.original_name.replace(/'/g, "\\'")}')" title="预览">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                </button>
                                ` : ''}
                                <button class="attachment-list-btn danger" onclick="deleteAttachment(${att.id}, '${att.original_name.replace(/'/g, "\\'")}');" title="删除">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `;
                });
                html += '</div>';
            } else {
                // 平铺模式（原有的grid布局）
                html = '<div class="attachment-grid">';
                
                filteredData.forEach(att => {
                    if (att.file_type && att.file_type.startsWith('image/')) {
                        html += `
                            <div class="attachment-item-image" style="position: relative;">
                                <button class="attachment-delete-btn" onclick="event.stopPropagation(); deleteAttachment(${att.id}, '${att.original_name.replace(/'/g, "\\'")}');" title="删除附件">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                                <div onclick="window.open('${att.url}', '_blank')" style="cursor: pointer;">
                                    <img src="${att.url}" alt="${att.original_name}" class="attachment-thumbnail">
                                    <div class="attachment-name">${att.original_name}</div>
                                </div>
                            </div>
                        `;
                    } else {
                        html += `
                            <div class="attachment-item-file" style="position: relative;">
                                <button class="attachment-delete-btn" onclick="event.stopPropagation(); deleteAttachment(${att.id}, '${att.original_name.replace(/'/g, "\\'")}');" title="删除附件">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                                <div onclick="window.location.href='${att.url}'" style="cursor: pointer;">
                                    <div class="attachment-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M13.234 20.252 21 12.3"></path>
                                            <path d="m16 6-8.414 8.586a2 2 0 0 0 0 2.828 2 2 0 0 0 2.828 0l8.414-8.586a4 4 0 0 0 0-5.656 4 4 0 0 0-5.656 0l-8.415 8.585a6 6 0 1 0 8.486 8.486"></path>
                                        </svg>
                                    </div>
                                    <div class="attachment-name">${att.original_name}</div>
                                </div>
                            </div>
                        `;
                    }
                });
                
                html += '</div>';
            }
            
            if (filteredData.length === 0) {
                memoList.innerHTML = getAttachmentSearchHtml(searchTerm, fileType) + '<div class="empty-state"><p>没有找到匹配的附件</p></div>';
            } else {
                // 添加分页控件
                const totalPages = Math.ceil(actualTotal / attachmentPerPage);
                const paginationHtml = generateAttachmentPagination(page, totalPages, actualTotal, filteredData.length);
                
                memoList.innerHTML = getAttachmentSearchHtml(searchTerm, fileType) + html + paginationHtml;
            }
            
            // 设置搜索框事件监听
            setupAttachmentSearchEvents();
        } else {
            memoList.innerHTML = getAttachmentSearchHtml(searchTerm, fileType) + `<div class="empty-state"><p>${searchTerm ? '没有找到匹配的附件' : '还没有附件'}</p></div>`;
            
            // 设置搜索框事件监听
            setupAttachmentSearchEvents();
        }
    } catch (error) {
        console.error('加载附件失败:', error);
        memoList.innerHTML = getAttachmentSearchHtml(searchTerm, fileType) + '<div class="empty-state"><p>加载失败</p></div>';
        
        // 设置搜索框事件监听
        setupAttachmentSearchEvents();
    }
}

// 匹配文件类型
function matchFileType(filename, mimeType, category) {
    const ext = filename.toLowerCase().split('.').pop();
    
    const categories = {
        image: {
            mimes: ['image/'],
            exts: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif']
        },
        text: {
            mimes: ['text/'],
            exts: ['txt', 'md', 'markdown', 'json', 'xml', 'html', 'htm', 'css', 'js', 'ts', 'jsx', 'tsx', 'vue', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'go', 'rs', 'php', 'rb', 'sh', 'bat', 'cmd', 'ps1', 'sql', 'yaml', 'yml', 'toml', 'ini', 'conf', 'log']
        },
        document: {
            mimes: ['application/pdf', 'application/msword', 'application/vnd.ms-', 'application/vnd.openxmlformats-officedocument'],
            exts: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf', 'tex', 'epub', 'mobi']
        },
        archive: {
            mimes: ['application/zip', 'application/x-zip', 'application/x-rar', 'application/x-7z', 'application/x-tar', 'application/gzip'],
            exts: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz', 'tbz2', 'txz', 'iso', 'dmg']
        }
    };
    
    const cat = categories[category];
    if (!cat) return false;
    
    // 检查MIME类型
    if (mimeType) {
        for (const mime of cat.mimes) {
            if (mimeType.toLowerCase().includes(mime.toLowerCase())) {
                return true;
            }
        }
    }
    
    // 检查扩展名
    return cat.exts.includes(ext);
}

// 生成附件分页控件
function generateAttachmentPagination(currentPage, totalPages, totalCount, currentCount) {
    if (totalPages <= 1) return '';
    
    let html = '<div class="attachment-pagination">';
    
    // 分页信息
    html += `<div class="pagination-info">显示 ${currentCount} / ${totalCount} 个附件</div>`;
    
    // 分页按钮
    html += '<div class="pagination-controls">';
    
    // 每页数量选择
    html += `
        <select class="per-page-select" onchange="changeAttachmentPerPage(this.value)">
            <option value="15" ${attachmentPerPage === 15 ? 'selected' : ''}>15条/页</option>
            <option value="30" ${attachmentPerPage === 30 ? 'selected' : ''}>30条/页</option>
            <option value="45" ${attachmentPerPage === 45 ? 'selected' : ''}>45条/页</option>
            <option value="60" ${attachmentPerPage === 60 ? 'selected' : ''}>60条/页</option>
            <option value="90" ${attachmentPerPage === 90 ? 'selected' : ''}>90条/页</option>
        </select>
    `;
    
    // 上一页按钮
    html += `
        <button class="pagination-btn" onclick="loadAttachmentPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
        </button>
    `;
    
    // 页码显示
    html += `<span class="page-number">第 ${currentPage} / ${totalPages} 页</span>`;
    
    // 下一页按钮
    html += `
        <button class="pagination-btn" onclick="loadAttachmentPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        </button>
    `;
    
    html += '</div>';
    html += '</div>';
    
    return html;
}

// 加载指定页的附件
function loadAttachmentPage(page) {
    const searchInput = document.getElementById('attachmentSearchInput');
    const typeFilter = document.getElementById('attachmentTypeFilter');
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    const fileType = typeFilter ? typeFilter.value : 'all';
    loadAttachments(searchTerm, fileType, page);
}

// 改变每页显示数量
function changeAttachmentPerPage(perPage) {
    attachmentPerPage = parseInt(perPage);
    localStorage.setItem('attachmentPerPage', attachmentPerPage);
    
    // 重新加载第一页
    const searchInput = document.getElementById('attachmentSearchInput');
    const typeFilter = document.getElementById('attachmentTypeFilter');
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    const fileType = typeFilter ? typeFilter.value : 'all';
    loadAttachments(searchTerm, fileType, 1);
}

// 切换附件视图模式
function switchAttachmentView(mode) {
    attachmentViewMode = mode;
    localStorage.setItem('attachmentViewMode', mode);
    
    // 重新加载附件列表
    const searchInput = document.getElementById('attachmentSearchInput');
    const typeFilter = document.getElementById('attachmentTypeFilter');
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    const fileType = typeFilter ? typeFilter.value : 'all';
    loadAttachments(searchTerm, fileType, attachmentPage);
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// 预览附件图片
function previewAttachmentImage(url, name) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');
    const lightboxCounter = document.getElementById('lightboxCounter');
    
    if (lightbox && lightboxImage) {
        lightboxImage.src = url;
        lightboxImage.alt = name;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // 隐藏左右切换按钮和计数器（附件预览只预览单张）
        if (lightboxPrev) lightboxPrev.style.display = 'none';
        if (lightboxNext) lightboxNext.style.display = 'none';
        if (lightboxCounter) lightboxCounter.style.display = 'none';
    }
}

// 搜索附件
function searchAttachments() {
    const searchInput = document.getElementById('attachmentSearchInput');
    const typeFilter = document.getElementById('attachmentTypeFilter');
    if (searchInput && typeFilter) {
        const searchTerm = searchInput.value.trim();
        const fileType = typeFilter.value;
        loadAttachments(searchTerm, fileType, 1); // 搜索时重置到第一页
    }
}

// 设置附件搜索框事件监听
function setupAttachmentSearchEvents() {
    const searchInput = document.getElementById('attachmentSearchInput');
    if (searchInput) {
        // 添加键盘事件监听
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchAttachments();
            }
        });
    }
}

// 删除附件
async function deleteAttachment(attachmentId, attachmentName) {
    try {
        // 先检查附件是否被引用
        const checkResponse = await fetch(`api.php?action=attachments&check_reference=1&id=${attachmentId}`);
        const checkResult = await checkResponse.json();
        
        if (!checkResult.success) {
            showToast('检查附件引用失败', 'error');
            return;
        }
        
        let confirmMessage = '';
        if (checkResult.is_referenced) {
            // 附件被引用
            confirmMessage = `附件"${attachmentName}"被 ${checkResult.reference_count} 篇文章引用。\n\n删除后，这些文章中的附件链接将失效。\n\n确定要删除吗？`;
        } else {
            // 附件未被引用
            confirmMessage = `确定要删除附件"${attachmentName}"吗？`;
        }
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        // 执行删除
        const deleteResponse = await fetch('api.php?action=attachments', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: attachmentId })
        });
        
        const deleteResult = await deleteResponse.json();
        
        if (deleteResult.success) {
            showToast('附件删除成功', 'success');
            // 重新加载附件列表（保持当前页）
            const searchInput = document.getElementById('attachmentSearchInput');
            const typeFilter = document.getElementById('attachmentTypeFilter');
            const searchTerm = searchInput ? searchInput.value.trim() : '';
            const fileType = typeFilter ? typeFilter.value : 'all';
            loadAttachments(searchTerm, fileType, attachmentPage);
        } else {
            showToast('删除失败: ' + (deleteResult.error || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('删除附件失败:', error);
        showToast('删除失败', 'error');
    }
}

// 加载统计信息
async function loadStats() {
    const memoList = document.getElementById('memoList');
    const loadMore = document.querySelector('.load-more');
    const memoEditor = document.querySelector('.memo-editor');
    
    // 隐藏加载更多按钮和编辑器
    if (loadMore) {
        loadMore.style.display = 'none';
    }
    if (memoEditor) {
        memoEditor.style.display = 'none';
    }
    
    memoList.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    try {
        const response = await fetch('api.php?action=stats');
        const result = await response.json();
        
        if (result.data) {
            const stats = result.data;
            
            let html = '<div style="background: var(--sidebar-bg); border-radius: 12px; padding: 30px; box-shadow: var(--shadow);">';
            html += '<h2 style="margin-bottom: 20px;">笔记统计</h2>';
            
            // 写作热图
            html += generateWritingHeatmap(stats.daily_stats);
            
            html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">';
            html += `
                <div style="text-align: center; padding: 20px; background: var(--background); border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: var(--primary-color);">${stats.usage_days || 0}</div>
                    <div style="color: var(--text-muted); margin-top: 5px;">使用天数</div>
                </div>
                <div style="text-align: center; padding: 20px; background: var(--background); border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: var(--primary-color);">${stats.record_days || 0}</div>
                    <div style="color: var(--text-muted); margin-top: 5px;">记录天数</div>
                </div>
                <div style="text-align: center; padding: 20px; background: var(--background); border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: var(--primary-color);">${stats.consecutive_days || 0}</div>
                    <div style="color: var(--text-muted); margin-top: 5px;">连续记录</div>
                </div>
                <div style="text-align: center; padding: 20px; background: var(--background); border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: var(--primary-color);">${stats.total_memos}</div>
                    <div style="color: var(--text-muted); margin-top: 5px;">总笔记数</div>
                </div>
                <div style="text-align: center; padding: 20px; background: var(--background); border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: var(--primary-color);">${stats.total_tags}</div>
                    <div style="color: var(--text-muted); margin-top: 5px;">总标签数</div>
                </div>
                <div style="text-align: center; padding: 20px; background: var(--background); border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: var(--primary-color);">${stats.total_attachments}</div>
                    <div style="color: var(--text-muted); margin-top: 5px;">总附件数</div>
                </div>
                <div style="text-align: center; padding: 20px; background: var(--background); border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: var(--primary-color);">${stats.week_memos}</div>
                    <div style="color: var(--text-muted); margin-top: 5px;">本周新增</div>
                </div>
                <div style="text-align: center; padding: 20px; background: var(--background); border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: var(--primary-color);">${stats.month_memos}</div>
                    <div style="color: var(--text-muted); margin-top: 5px;">本月新增</div>
                </div>
                <div style="text-align: center; padding: 20px; background: var(--background); border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: var(--primary-color);">${stats.year_memos}</div>
                    <div style="color: var(--text-muted); margin-top: 5px;">本年新增</div>
                </div>
            `;
            html += '</div>';
            
            // 标签统计
            if (stats.tag_stats && stats.tag_stats.length > 0) {
                html += '<h3 style="margin-bottom: 15px;">热门标签</h3>';
                html += '<div style="display: flex; flex-wrap: wrap; gap: 10px;">';
                stats.tag_stats.forEach(tag => {
                    html += `
                        <div style="padding: 8px 16px; background: rgba(102, 126, 234, 0.1); color: var(--primary-color); border-radius: 20px; font-size: 14px;">
                            #${tag.name} <span style="opacity: 0.7;">(${tag.count})</span>
                        </div>
                    `;
                });
                html += '</div>';
            }
            
            html += '</div>';
            memoList.innerHTML = html;
        }
    } catch (error) {
        console.error('加载统计失败:', error);
        memoList.innerHTML = '<div class="empty-state"><p>加载失败</p></div>';
    }
}

// 加载分享管理页面
async function loadShareManagement(searchTerm = '', statusFilter = 'all', encryptedFilter = 'all') {
    const memoList = document.getElementById('memoList');
    const loadMore = document.querySelector('.load-more');
    const memoEditor = document.querySelector('.memo-editor');
    
    // 隐藏加载更多按钮和编辑器
    if (loadMore) {
        loadMore.style.display = 'none';
    }
    if (memoEditor) {
        memoEditor.style.display = 'none';
    }
    
    memoList.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    try {
        const itemsPerPage = getItemsPerPage();
        const params = new URLSearchParams({
            page: 1,
            limit: itemsPerPage
        });
        
        if (searchTerm) params.append('search', searchTerm);
        if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
        if (encryptedFilter && encryptedFilter !== 'all') params.append('encrypted', encryptedFilter);
        
        const response = await fetch(`api.php?action=shares&${params.toString()}`);
        const result = await response.json();
        
        // 确保result和result.data存在，即使是空数组也要显示界面
        if (result && result.data !== undefined) {
            let html = '<div style="background: var(--sidebar-bg); border-radius: 12px; padding: 20px 25px; box-shadow: var(--shadow);">';
            html += '<h2 style="margin-bottom: 15px;">分享管理</h2>';
            
            // 添加搜索和筛选栏
            html += `
                <div class="share-search-bar">
                    <div class="share-search-input-wrapper">
                        <input type="text" id="shareSearchInput" class="share-search-input" placeholder="搜索分享内容..." value="${searchTerm}">
                        <button class="share-search-btn" onclick="searchShares()" title="搜索">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="share-filters">
                        <select id="shareStatusFilter" class="share-filter-select" onchange="searchShares()">
                            <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>全部状态</option>
                            <option value="active" ${statusFilter === 'active' ? 'selected' : ''}>分享中</option>
                            <option value="expired" ${statusFilter === 'expired' ? 'selected' : ''}>已过期</option>
                        </select>
                        <select id="shareEncryptedFilter" class="share-filter-select" onchange="searchShares()">
                            <option value="all" ${encryptedFilter === 'all' ? 'selected' : ''}>全部类型</option>
                            <option value="1" ${encryptedFilter === '1' ? 'selected' : ''}>加密分享</option>
                            <option value="0" ${encryptedFilter === '0' ? 'selected' : ''}>公开分享</option>
                        </select>
                    </div>
                </div>
            `;
            
            if (result.data.length === 0) {
                html += '<div class="empty-state"><p>还没有分享任何笔记</p></div>';
            } else {
                // 添加批量操作栏
                html += `
                    <div class="share-batch-actions">
                        <label class="checkbox-label">
                            <input type="checkbox" id="selectAllShares" onchange="toggleSelectAllShares()">
                            <span>全选</span>
                        </label>
                        <button class="btn-danger btn-sm" id="batchDeleteBtn" onclick="batchDeleteShares()" disabled>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            批量删除
                        </button>
                        <span id="selectedCount" style="color: var(--text-muted); font-size: 14px;">已选择 0 项</span>
                    </div>
                `;
                
                html += '<div class="share-list">';
                
                result.data.forEach(share => {
                    const statusClass = share.status === 'active' ? 'status-active' : 'status-expired';
                    const shareUrl = `${window.location.origin}${window.location.pathname.replace('index.php', '')}share.php?token=${share.token}`;
                    
                    html += `
                        <div class="share-item" data-id="${share.id}">
                            <input type="checkbox" class="share-checkbox" data-share-id="${share.id}" onchange="updateBatchDeleteButton()">
                            <div class="share-content">
                                <div class="share-preview" onclick="window.open('${shareUrl}', '_blank')" style="cursor: pointer;" title="点击在新窗口打开分享链接">${share.content_preview || '(无内容)'}</div>
                                <div class="share-meta">
                                    <span class="share-status ${statusClass}">${share.status_text}</span>
                                    ${(share.encrypted == 1 || share.encrypted === true) ? '<span class="share-encrypted" style="color: #d97706; font-weight: 500;">🔒 加密</span>' : ''}
                                    <span class="share-visits">访问: ${share.visit_count}次</span>
                                    <span class="share-max">限制: ${share.max_visits ? `${share.max_visits}次` : '无'}</span>
                                    ${share.expires_at ? `<span class="share-expires">过期: ${share.expires_at}</span>` : '<span class="share-expires">永久</span>'}
                                </div>
                            </div>
                            <div class="share-actions">
                                <button class="share-btn" onclick="copyShareManagementLink('${shareUrl}')" title="复制链接">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </button>
                                <button class="share-btn" onclick='editShare(${JSON.stringify(share).replace(/'/g, "&apos;")})' title="编辑">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                                <button class="share-btn danger" onclick="deleteShare(${share.id})" title="删除">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `;
                });
                
                html += '</div>';
                
                // 分页信息
                if (result.total > itemsPerPage) {
                    const totalPages = Math.ceil(result.total / itemsPerPage);
                    html += `
                        <div style="margin-top: 20px; text-align: center; color: var(--text-muted); font-size: 14px;">
                            显示 ${result.data.length} / ${result.total} 条分享
                        </div>
                    `;
                }
            }
            
            html += '</div>';
            memoList.innerHTML = html;
            
            // 添加搜索框回车事件监听
            const shareSearchInput = document.getElementById('shareSearchInput');
            if (shareSearchInput) {
                shareSearchInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        searchShares();
                    }
                });
            }
        } else {
            // API返回了错误或格式不正确
            let html = '<div style="background: var(--sidebar-bg); border-radius: 12px; padding: 20px 25px; box-shadow: var(--shadow);">';
            html += '<h2 style="margin-bottom: 15px;">分享管理</h2>';
            html += '<div class="empty-state">';
            html += '<p>加载失败：' + (result.error || '未知错误') + '</p>';
            html += '</div>';
            html += '</div>';
            memoList.innerHTML = html;
        }
    } catch (error) {
        console.error('加载分享管理失败:', error);
        let html = '<div style="background: var(--sidebar-bg); border-radius: 12px; padding: 20px 25px; box-shadow: var(--shadow);">';
        html += '<h2 style="margin-bottom: 15px;">分享管理</h2>';
        html += '<div class="empty-state">';
        html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.5;">';
        html += '<circle cx="12" cy="12" r="10"></circle>';
        html += '<line x1="12" y1="8" x2="12" y2="12"></line>';
        html += '<line x1="12" y1="16" x2="12.01" y2="16"></line>';
        html += '</svg>';
        html += '<p>加载失败：' + error.message + '</p>';
        html += '<p style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">如果是首次安装，请尝试刷新页面</p>';
        html += '</div>';
        html += '</div>';
        memoList.innerHTML = html;
    }
}

// 搜索分享
function searchShares() {
    const searchInput = document.getElementById('shareSearchInput');
    const statusFilter = document.getElementById('shareStatusFilter');
    const encryptedFilter = document.getElementById('shareEncryptedFilter');
    
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    const status = statusFilter ? statusFilter.value : 'all';
    const encrypted = encryptedFilter ? encryptedFilter.value : 'all';
    
    loadShareManagement(searchTerm, status, encrypted);
}

// 复制分享管理链接
function copyShareManagementLink(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            showToast('分享链接已复制到剪贴板！', 'success');
        }).catch((err) => {
            console.error('复制失败:', err);
            showToast('复制失败，请手动复制', 'warning');
            prompt('请手动复制分享链接:', url);
        });
    } else {
        // 降级方案
        showToast('浏览器不支持自动复制，请手动复制', 'info');
        prompt('请手动复制分享链接:', url);
    }
}

// 编辑分享
function editShare(share) {
    const modal = document.getElementById('editShareModal');
    if (!modal) return;
    
    // 填充表单数据
    document.getElementById('editShareId').value = share.id;
    
    // 加密状态（只读）
    const encryptedCheckbox = document.getElementById('editShareEncrypted');
    const passcodeGroup = document.getElementById('editPasscodeGroup');
    const passcodeInput = document.getElementById('editSharePasscode');
    
    if (encryptedCheckbox) {
        encryptedCheckbox.checked = share.encrypted == 1 || share.encrypted === true;
    }
    
    // 如果是加密分享，显示提取码输入框
    if (passcodeGroup && passcodeInput) {
        if (share.encrypted == 1 || share.encrypted === true) {
            passcodeGroup.style.display = 'block';
            passcodeInput.value = ''; // 默认留空，不修改
        } else {
            passcodeGroup.style.display = 'none';
        }
    }
    
    // 过期时间
    const expireNever = document.getElementById('editShareExpireNever');
    const expireAt = document.getElementById('editShareExpireAt');
    const expireAtInput = document.getElementById('editShareExpireAtInput');
    
    if (share.expires_at) {
        if (expireAt) expireAt.checked = true;
        if (expireAtInput) {
            // 转换为 datetime-local 格式: YYYY-MM-DDTHH:MM
            const datetime = share.expires_at.replace(' ', 'T');
            expireAtInput.value = datetime;
            expireAtInput.disabled = false;
        }
    } else {
        if (expireNever) expireNever.checked = true;
        if (expireAtInput) {
            expireAtInput.value = '';
            expireAtInput.disabled = true;
        }
    }
    
    // 访问次数限制
    const maxVisitsInput = document.getElementById('editShareMaxVisits');
    if (maxVisitsInput) {
        maxVisitsInput.value = share.max_visits || '';
    }
    
    // 显示弹窗
    modal.style.display = 'flex';
}

// 隐藏编辑分享弹窗
function hideEditShareModal() {
    const modal = document.getElementById('editShareModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 生成新的提取码
function generateNewPasscode() {
    const passcodeInput = document.getElementById('editSharePasscode');
    if (passcodeInput) {
        passcodeInput.value = generateRandomCode(5);
    }
}

// 保存分享编辑
async function saveShareEdit() {
    const shareId = document.getElementById('editShareId').value;
    const encryptedCheckbox = document.getElementById('editShareEncrypted');
    const passcodeInput = document.getElementById('editSharePasscode');
    const expireAt = document.getElementById('editShareExpireAt');
    const expireAtInput = document.getElementById('editShareExpireAtInput');
    const maxVisitsInput = document.getElementById('editShareMaxVisits');
    
    if (!shareId) {
        showToast('缺少分享ID', 'error');
        return;
    }
    
    // 过期时间
    let expiresAt = null;
    if (expireAt && expireAt.checked) {
        const dt = expireAtInput ? expireAtInput.value : '';
        if (!dt) {
            showToast('请选择过期时间或选择"永不过期"', 'warning');
            return;
        }
        // datetime-local -> YYYY-MM-DD HH:MM
        expiresAt = dt.replace('T', ' ').slice(0, 16);
    }
    
    // 访问次数限制
    const maxVisitsValue = maxVisitsInput ? maxVisitsInput.value : '';
    const maxVisits = maxVisitsValue ? parseInt(maxVisitsValue) : null;
    
    // 新的提取码（如果有输入）
    const newPasscode = passcodeInput && passcodeInput.value.trim() ? passcodeInput.value.trim() : null;
    
    try {
        const updateData = {
            id: parseInt(shareId),
            expires_at: expiresAt,
            max_visits: maxVisits
        };
        
        // 如果是加密分享且提供了新提取码
        if (encryptedCheckbox && encryptedCheckbox.checked && newPasscode) {
            updateData.passcode = newPasscode;
        }
        
        const response = await fetch('api.php?action=share', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('分享更新成功！', 'success');
            hideEditShareModal();
            loadShareManagement();
        } else {
            showToast('更新失败: ' + (result.error || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('更新分享失败:', error);
        showToast('更新失败', 'error');
    }
}

// 删除分享
function deleteShare(shareId) {
    if (!confirm('确定要删除这个分享吗？')) {
        return;
    }
    
    fetch(`api.php?action=share&id=${shareId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast('删除成功！', 'success');
            loadShareManagement();
        } else {
            showToast('删除失败: ' + (result.error || '未知错误'), 'error');
        }
    })
    .catch(error => {
        console.error('删除分享失败:', error);
        showToast('删除失败', 'error');
    });
}

// 全选/取消全选分享
function toggleSelectAllShares() {
    const selectAllCheckbox = document.getElementById('selectAllShares');
    const checkboxes = document.querySelectorAll('.share-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    
    updateBatchDeleteButton();
}

// 更新批量删除按钮状态
function updateBatchDeleteButton() {
    const checkboxes = document.querySelectorAll('.share-checkbox:checked');
    const batchDeleteBtn = document.getElementById('batchDeleteBtn');
    const selectedCount = document.getElementById('selectedCount');
    const selectAllCheckbox = document.getElementById('selectAllShares');
    
    const count = checkboxes.length;
    
    if (batchDeleteBtn) {
        batchDeleteBtn.disabled = count === 0;
    }
    
    if (selectedCount) {
        selectedCount.textContent = `已选择 ${count} 项`;
    }
    
    // 更新全选复选框状态
    if (selectAllCheckbox) {
        const allCheckboxes = document.querySelectorAll('.share-checkbox');
        selectAllCheckbox.checked = allCheckboxes.length > 0 && count === allCheckboxes.length;
        selectAllCheckbox.indeterminate = count > 0 && count < allCheckboxes.length;
    }
}

// 批量删除分享
async function batchDeleteShares() {
    const checkboxes = document.querySelectorAll('.share-checkbox:checked');
    const shareIds = Array.from(checkboxes).map(cb => cb.dataset.shareId);
    
    if (shareIds.length === 0) {
        showToast('请先选择要删除的分享', 'warning');
        return;
    }
    
    if (!confirm(`确定要删除选中的 ${shareIds.length} 个分享吗？`)) {
        return;
    }
    
    try {
        const response = await fetch('api.php?action=batch_delete_shares', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ids: shareIds
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`成功删除 ${result.deleted_count || shareIds.length} 个分享`, 'success');
            loadShareManagement();
        } else {
            showToast('批量删除失败: ' + (result.error || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('批量删除失败:', error);
        showToast('批量删除失败', 'error');
    }
}

// 加载设置页面
async function loadSettings() {
    const memoList = document.getElementById('memoList');
    const loadMore = document.querySelector('.load-more');
    const memoEditor = document.querySelector('.memo-editor');
    
    // 隐藏加载更多按钮和编辑器
    if (loadMore) {
        loadMore.style.display = 'none';
    }
    if (memoEditor) {
        memoEditor.style.display = 'none';
    }
    
    memoList.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    try {
        // 模拟加载延迟
        await new Promise(resolve => setTimeout(resolve, 300));
        
        let html = '<div style="background: var(--sidebar-bg); border-radius: 12px; padding: 30px; box-shadow: var(--shadow);">';
        html += '<h2 style="margin-bottom: 30px; display: flex; align-items: center; gap: 8px;">设置<span class="help-icon" onclick="showHelpModal()" style="cursor: pointer; color: var(--text-muted); font-size: 18px; transition: color 0.2s;" onmouseover="this.style.color=\'var(--text-primary)\'" onmouseout="this.style.color=\'var(--text-muted)\'" title="程序介绍">?</span></h2>';
        
        // 外观设置部分
        html += '<div style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color);">';
        html += '<h3 style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 15px;">外观设置</h3>';
        html += '<div style="display: flex; flex-direction: column; gap: 12px;">';
        html += '<p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">主题模式</p>';
        html += '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">';
        
        const currentTheme = localStorage.getItem('theme') || 'light';
        
        html += `
            <button class="theme-option ${currentTheme === 'light' ? 'active' : ''}" onclick="changeTheme('light')" style="padding: 12px; background: var(--background); border: 2px solid var(--border-color); border-radius: 8px; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px;">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
                <span style="font-size: 13px; color: var(--text-primary);">亮色</span>
            </button>
            <button class="theme-option ${currentTheme === 'dark' ? 'active' : ''}" onclick="changeTheme('dark')" style="padding: 12px; background: var(--background); border: 2px solid var(--border-color); border-radius: 8px; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px;">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
                <span style="font-size: 13px; color: var(--text-primary);">暗色</span>
            </button>
            <button class="theme-option ${currentTheme === 'auto' ? 'active' : ''}" onclick="changeTheme('auto')" style="padding: 12px; background: var(--background); border: 2px solid var(--border-color); border-radius: 8px; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px;">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                <span style="font-size: 13px; color: var(--text-primary);">跟随系统</span>
            </button>
        `;
        html += '</div>';
        
        // 分页数设置（添加分割线）
        html += '<div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color);">';
        const itemsPerPage = getItemsPerPage();
        html += '<p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">时间流每页显示数量</p>';
        html += '<div style="display: flex; align-items: center; gap: 12px;">';
        html += `
            <input type="number" 
                   id="itemsPerPageInput" 
                   value="${itemsPerPage}" 
                   min="5" 
                   max="100" 
                   style="width: 100px; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px; background: var(--background); color: var(--text-primary);">
            <button class="btn-primary" onclick="saveItemsPerPage()" style="padding: 8px 16px; font-size: 14px;">
                保存
            </button>
            <span style="font-size: 13px; color: var(--text-muted);">默认: 20</span>
        `;
        html += '</div>';
        html += '</div>';
        
        // 文章最大显示高度设置
        html += '<div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color);">';
        const maxMemoHeight = getMaxMemoHeight();
        html += '<p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">文章最大显示高度（像素）</p>';
        html += '<div style="display: flex; align-items: center; gap: 12px;">';
        html += `
            <input type="number" 
                   id="maxMemoHeightInput" 
                   value="${maxMemoHeight}" 
                   min="0" 
                   max="5000" 
                   placeholder="0表示不限制"
                   style="width: 120px; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px; background: var(--background); color: var(--text-primary);">
            <button class="btn-primary" onclick="saveMaxMemoHeight()" style="padding: 8px 16px; font-size: 14px;">
                保存
            </button>
            <span style="font-size: 13px; color: var(--text-muted);">0表示不限制，建议500-1000</span>
        `;
        html += '</div>';
        html += '</div>';
        
        html += '</div>';
        html += '</div>';
        
        // 数据导出部分
        html += '<div style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color);">';
        html += '<h3 style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 15px;">数据导出</h3>';
        html += '<div style="display: flex; flex-direction: column; gap: 10px;">';
        html += `
            <button class="btn-secondary" onclick="exportData('json')" style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--background); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.2s; text-decoration: none;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7,10 12,15 17,10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                导出 JSON
            </button>
            <button class="btn-secondary" onclick="exportData('csv')" style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--background); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.2s; text-decoration: none;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7,10 12,15 17,10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                导出 CSV
            </button>
        `;
        html += '</div>';
        html += '</div>';
        
        // 备份管理部分
        html += '<div style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color);">';
        html += '<h3 style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 15px;">备份管理</h3>';
        html += '<div style="display: flex; flex-direction: column; gap: 10px;">';
        html += `
            <button class="btn-secondary" onclick="createBackup()" style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--background); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.2s; text-decoration: none;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                    <path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"></path>
                </svg>
                创建备份
            </button>
            <button class="btn-secondary" onclick="showBackupList()" style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--background); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.2s; text-decoration: none;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14,2 14,8 20,8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10,9 9,9 8,9"></polyline>
                </svg>
                备份管理
            </button>
        `;
        html += '</div>';
        html += '</div>';
        
        // 数据维护部分
        html += '<div style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color);">';
        html += '<h3 style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 15px;">数据维护</h3>';
        html += '<div style="display: flex; flex-direction: column; gap: 10px;">';
        html += `
            <button class="btn-secondary" onclick="cleanupEmptyTags()" style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--background); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.2s; text-decoration: none;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
                清理空标签
            </button>
        `;
        html += '</div>';
        html += '</div>';
        
        // 用户管理部分
        html += '<div style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color);">';
        html += '<h3 style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 15px;">用户管理</h3>';
        html += '<div style="display: flex; flex-direction: column; gap: 10px;">';
        html += `
            <button class="btn-secondary" onclick="showChangeUsernameModal()" style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--background); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.2s; text-decoration: none;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
                修改用户名
            </button>
            <button class="btn-secondary" onclick="showChangePasswordModal()" style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--background); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.2s; text-decoration: none;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <circle cx="12" cy="16" r="1"></circle>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                修改密码
            </button>
            <button class="btn-secondary" onclick="showSiteSettingsModal()" style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--background); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.2s; text-decoration: none;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                网站设置
            </button>
        `;
        html += '</div>';
        html += '</div>';
        
        // API 管理部分
        html += '<div style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color);">';
        html += '<h3 style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 15px;">API 管理</h3>';
        html += '<div style="display: flex; flex-direction: column; gap: 10px;">';
        html += `
            <button class="btn-secondary" onclick="showApiTokensManagement()" style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--background); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.2s; text-decoration: none;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                API Tokens 管理
            </button>
        `;
        html += '</div>';
        html += '</div>';
        
        // 系统信息部分
        html += '<div style="margin-bottom: 0;">';
        html += '<h3 style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 15px;">系统信息</h3>';
        html += '<div style="background: var(--background); padding: 15px; border-radius: 8px; font-size: 14px; color: var(--text-secondary);">';
        html += '<p style="margin: 5px 0;">版本: 1.0.0</p>';
        html += '<p style="margin: 5px 0;">数据库: SQLite</p>';
        html += `<p style="margin: 5px 0;">最后更新: <span style="color: var(--text-primary); font-weight: 500;">${new Date().toLocaleString('zh-CN')}</span></p>`;
        html += '</div>';
        html += '</div>';
        
        html += '</div>';
        memoList.innerHTML = html;
        
    } catch (error) {
        console.error('加载设置失败:', error);
        memoList.innerHTML = '<div class="empty-state"><p>加载失败</p></div>';
    }
}

// 生成写作热图
function generateWritingHeatmap(dailyStats) {
    // 创建日期到数量的映射
    const dateMap = {};
    dailyStats.forEach(stat => {
        dateMap[stat.date] = parseInt(stat.count);
    });
    
    // 获取近6个月的日期范围
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    
    // 生成热图数据
    const heatmapData = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const count = dateMap[dateStr] || 0;
        heatmapData.push({
            date: dateStr,
            count: count
        });
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 计算最大数量用于颜色分级
    const maxCount = Math.max(...heatmapData.map(d => d.count));
    
    // 生成热图HTML
    let html = '<div style="margin-bottom: 30px;">';
    html += '<h3 style="margin-bottom: 15px;">写作热图</h3>';
    html += '<div style="display: flex; align-items: flex-start; gap: 10px; overflow-x: auto; padding: 10px 0;">';
    
    // 按周分组显示
    const weeks = [];
    for (let i = 0; i < heatmapData.length; i += 7) {
        weeks.push(heatmapData.slice(i, i + 7));
    }
    
    weeks.forEach(week => {
        html += '<div style="display: flex; flex-direction: column; gap: 2px;">';
        week.forEach(day => {
            const intensity = maxCount > 0 ? day.count / maxCount : 0;
            const color = getHeatmapColor(intensity);
            const date = new Date(day.date);
            const dayName = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
            
            html += `
                <div style="
                    width: 12px; 
                    height: 12px; 
                    background-color: ${color}; 
                    border-radius: 2px; 
                    cursor: pointer;
                    position: relative;
                " 
                title="${day.date} (${dayName}) - ${day.count} 篇笔记"
                onmouseover="showTooltip(event, '${day.date}', ${day.count})"
                onmouseout="hideTooltip()">
                </div>
            `;
        });
        html += '</div>';
    });
    
    html += '</div>';
    
    // 添加图例
    html += '<div style="display: flex; align-items: center; gap: 10px; margin-top: 15px; font-size: 12px; color: var(--text-muted);">';
    html += '<span>少</span>';
    for (let i = 0; i <= 4; i++) {
        const intensity = i / 4;
        const color = getHeatmapColor(intensity);
        html += `<div style="width: 10px; height: 10px; background-color: ${color}; border-radius: 2px;"></div>`;
    }
    html += '<span>多</span>';
    html += '</div>';
    
    html += '</div>';
    
    return html;
}

// 获取热图颜色
function getHeatmapColor(intensity) {
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    
    if (isDarkMode) {
        // 暗色模式配色
        if (intensity === 0) return '#161b22';
        if (intensity <= 0.25) return '#0e4429';
        if (intensity <= 0.5) return '#006d32';
        if (intensity <= 0.75) return '#26a641';
        return '#39d353';
    } else {
        // 亮色模式配色
    if (intensity === 0) return '#ebedf0';
    if (intensity <= 0.25) return '#c6e48b';
    if (intensity <= 0.5) return '#7bc96f';
    if (intensity <= 0.75) return '#239a3b';
    return '#196127';
    }
}

// 显示提示框
function showTooltip(event, date, count) {
    const tooltip = document.createElement('div');
    tooltip.id = 'heatmap-tooltip';
    tooltip.style.cssText = `
        position: absolute;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        z-index: 1000;
        pointer-events: none;
        white-space: nowrap;
    `;
    tooltip.textContent = `${date} - ${count} 篇笔记`;
    
    document.body.appendChild(tooltip);
    
    const rect = event.target.getBoundingClientRect();
    tooltip.style.left = rect.left + window.scrollX + 'px';
    tooltip.style.top = rect.top + window.scrollY - 35 + 'px';
}

// 隐藏提示框
function hideTooltip() {
    const tooltip = document.getElementById('heatmap-tooltip');
    if (tooltip) {
        tooltip.remove();
    }
}

// 格式化时间
function formatTime(datetime) {
    const date = new Date(datetime);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) {
        return '刚刚';
    } else if (diff < 3600000) {
        return Math.floor(diff / 60000) + ' 分钟前';
    } else if (diff < 86400000) {
        return Math.floor(diff / 3600000) + ' 小时前';
    } else if (diff < 604800000) {
        return Math.floor(diff / 86400000) + ' 天前';
    } else {
        return date.getFullYear() + '-' + 
               String(date.getMonth() + 1).padStart(2, '0') + '-' + 
               String(date.getDate()).padStart(2, '0') + ' ' +
               String(date.getHours()).padStart(2, '0') + ':' + 
               String(date.getMinutes()).padStart(2, '0');
    }
}


// 导出数据
async function exportData(format) {
    try {
        const response = await fetch('api.php?action=export&format=' + format);
        const result = await response.json();
        
        if (result.success && result.data) {
            const data = result.data;
            const filename = `memos_export_${new Date().toISOString().split('T')[0]}.${format}`;
            
            let content, mimeType;
            if (format === 'json') {
                content = JSON.stringify(data, null, 2);
                mimeType = 'application/json';
            } else if (format === 'csv') {
                content = convertToCSV(data);
                mimeType = 'text/csv';
            }
            
            downloadFile(content, filename, mimeType);
            showToast('导出成功！', 'success');
        } else {
            const errorMsg = result.error || result.message || '未知错误';
            showToast('导出失败：' + errorMsg, 'error');
        }
    } catch (error) {
        console.error('导出错误:', error);
        showToast('导出失败：' + (error.message || '网络错误'), 'error');
    }
}

// 转换为CSV格式
function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = ['ID', '内容', '标签', '创建时间', '更新时间', '置顶', '归档', '可见性'];
    const csvContent = [
        headers.join(','),
        ...data.map(item => [
            item.id,
            `"${(item.content || '').replace(/"/g, '""')}"`,
            `"${(Array.isArray(item.tags) ? item.tags.map(tag => tag.name || tag).join(',') : (item.tags || '')).replace(/"/g, '""')}"`,
            item.created_at,
            item.updated_at,
            item.pinned ? '是' : '否',
            item.archived ? '是' : '否',
            item.visibility || 'private'
        ].join(','))
    ].join('\n');
    
    return csvContent;
}

// 下载文件
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 置顶笔记
async function pinMemo(id) {
    try {
        const response = await fetch(`api.php?action=memo&id=${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pinned: 1 })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 重新加载笔记列表
            currentPage = 1;
            hasMoreData = true;
            loadMemos('', false);
        } else {
            console.error('置顶失败响应:', result);
            showToast('置顶失败：' + (result.error || result.message || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('置顶失败:', error);
        showToast('置顶失败：' + error.message, 'error');
    }
}

// 取消置顶
async function unpinMemo(id) {
    try {
        const response = await fetch(`api.php?action=memo&id=${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pinned: 0 })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 重新加载笔记列表
            currentPage = 1;
            hasMoreData = true;
            loadMemos('', false);
        } else {
            console.error('取消置顶失败响应:', result);
            showToast('取消置顶失败：' + (result.error || result.message || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('取消置顶失败:', error);
        showToast('取消置顶失败：' + error.message, 'error');
    }
}

// 创建备份
async function createBackup() {
    try {
        const response = await fetch('api.php?action=backup');
        const result = await response.json();
        
        if (result.success) {
            showToast('备份创建成功！', 'success');
            // 如果备份模态框是打开的，刷新备份列表
            const backupModal = document.getElementById('backupModal');
            if (backupModal && backupModal.classList.contains('active')) {
                await loadBackupList();
            }
        } else {
            showToast('备份失败：' + (result.message || result.error || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('备份错误:', error);
        showToast('备份失败：' + error.message, 'error');
    }
}

// 显示备份列表
async function showBackupList() {
    const modal = document.getElementById('backupModal');
    if (modal) {
        modal.classList.add('active');
        await loadBackupList();
    }
}

// 隐藏备份模态框
function hideBackupModal() {
    const modal = document.getElementById('backupModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// 加载备份列表
async function loadBackupList() {
    const backupList = document.getElementById('backupList');
    if (!backupList) return;
    
    backupList.innerHTML = '<div class="loading">加载中...</div>';
    
    try {
        const response = await fetch('api.php?action=backup_list');
        const result = await response.json();
        
        if (result.success) {
            const backups = result.data;
            if (backups.length === 0) {
                backupList.innerHTML = `
                    <div class="backup-empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14,2 14,8 20,8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10,9 9,9 8,9"></polyline>
                        </svg>
                        <p>暂无备份文件</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            backups.forEach((backup, index) => {
                html += `
                    <div class="backup-item">
                        <div class="backup-info">
                            <div class="backup-name" onclick="downloadBackup('${backup.name}')" title="点击下载备份文件" style="cursor: pointer; color: var(--primary-color); text-decoration: underline;">${backup.name}</div>
                            <div class="backup-details">
                                创建时间: ${backup.created_at} | 大小: ${backup.size}
                            </div>
                        </div>
                        <div class="backup-actions-item">
                            <button class="backup-btn" onclick="restoreBackup('${backup.name}')">
                                恢复
                            </button>
                            <button class="backup-btn danger" onclick="deleteBackup('${backup.name}')">
                                删除
                            </button>
                        </div>
                    </div>
                `;
            });
            
            backupList.innerHTML = html;
        } else {
            backupList.innerHTML = '<div class="backup-empty">加载失败：' + (result.message || '未知错误') + '</div>';
        }
    } catch (error) {
        console.error('获取备份列表错误:', error);
        backupList.innerHTML = '<div class="backup-empty">加载失败：' + error.message + '</div>';
    }
}

// 下载备份
async function downloadBackup(backupName) {
    try {
        const downloadUrl = `api.php?action=download_backup&backup=${encodeURIComponent(backupName)}`;
        
        // 使用 fetch 下载文件
        const response = await fetch(downloadUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // 获取文件内容
        const blob = await response.blob();
        
        // 创建下载链接
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = backupName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 清理 URL 对象
        window.URL.revokeObjectURL(url);
        
        showToast('备份文件下载成功', 'success');
    } catch (error) {
        console.error('下载备份失败:', error);
        showToast('下载失败：' + error.message, 'error');
    }
}

// 恢复备份
async function restoreBackup(backupName) {
    if (!confirm(`确定要恢复到备份 "${backupName}" 吗？这将覆盖当前数据库！`)) {
        return;
    }
    
    try {
        const response = await fetch('api.php?action=restore&backup=' + encodeURIComponent(backupName));
        const result = await response.json();
        
        if (result.success) {
            showToast('恢复成功！页面将重新加载。', 'success');
            location.reload();
        } else {
            showToast('恢复失败：' + (result.message || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('恢复备份错误:', error);
        showToast('恢复失败：' + error.message, 'error');
    }
}

// 删除备份
async function deleteBackup(backupName) {
    if (!confirm(`确定要删除备份 "${backupName}" 吗？此操作不可恢复！`)) {
        return;
    }
    
    try {
        const response = await fetch('api.php?action=delete_backup&backup=' + encodeURIComponent(backupName));
        const result = await response.json();
        
        if (result.success) {
            showToast('删除成功！', 'success');
            await loadBackupList(); // 重新加载列表
        } else {
            showToast('删除失败：' + (result.message || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('删除备份错误:', error);
        showToast('删除失败：' + error.message, 'error');
    }
}

// 灯箱功能
let lightboxImages = [];
let currentImageIndex = 0;
let currentZoom = 1;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let imageOffsetX = 0;
let imageOffsetY = 0;

// 打开灯箱
function openLightbox(imageSrc, imageAlt = '') {
    // 收集当前页面中的所有图片
    collectImages();
    
    // 找到当前点击的图片在数组中的索引
    currentImageIndex = lightboxImages.findIndex(img => img.src === imageSrc);
    if (currentImageIndex === -1) {
        currentImageIndex = 0;
    }
    
    // 显示灯箱
    showLightbox();
}

// 收集页面中的所有图片
function collectImages() {
    lightboxImages = [];
    
    // 收集笔记内容中的图片
    const memoImages = document.querySelectorAll('.memo-content img');
    memoImages.forEach(img => {
        if (img.src && !img.src.includes('data:')) {
            lightboxImages.push({
                src: img.src,
                alt: img.alt || ''
            });
        }
    });
    
    // 收集附件缩略图
    const attachmentImages = document.querySelectorAll('.attachment-thumbnail');
    attachmentImages.forEach(img => {
        if (img.src && !img.src.includes('data:')) {
            // 避免重复添加
            if (!lightboxImages.some(existing => existing.src === img.src)) {
                lightboxImages.push({
                    src: img.src,
                    alt: img.alt || ''
                });
            }
        }
    });
}

// 显示灯箱
function showLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxCounter = document.getElementById('lightboxCounter');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');
    
    if (lightboxImages.length === 0) return;
    
    // 重置缩放和位置
    currentZoom = 1;
    imageOffsetX = 0;
    imageOffsetY = 0;
    
    // 设置当前图片
    const currentImage = lightboxImages[currentImageIndex];
    lightboxImage.src = currentImage.src;
    lightboxImage.alt = currentImage.alt;
    updateImageTransform(lightboxImage);
    
    // 更新计数器
    lightboxCounter.textContent = `${currentImageIndex + 1} / ${lightboxImages.length}`;
    
    // 显示/隐藏导航按钮
    lightboxPrev.style.display = lightboxImages.length > 1 ? 'flex' : 'none';
    lightboxNext.style.display = lightboxImages.length > 1 ? 'flex' : 'none';
    
    // 显示灯箱
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden'; // 防止背景滚动
    
    // 添加事件监听
    document.addEventListener('keydown', handleLightboxKeydown);
    lightboxImage.addEventListener('wheel', handleImageZoom, { passive: false });
    lightboxImage.addEventListener('mousedown', handleImageDragStart);
    document.addEventListener('mousemove', handleImageDrag);
    document.addEventListener('mouseup', handleImageDragEnd);
}

// 关闭灯箱
function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');
    const lightboxCounter = document.getElementById('lightboxCounter');
    
    lightbox.classList.remove('active');
    document.body.style.overflow = ''; // 恢复滚动
    
    // 恢复左右切换按钮和计数器的显示（为笔记图片预览准备）
    if (lightboxPrev) lightboxPrev.style.display = '';
    if (lightboxNext) lightboxNext.style.display = '';
    if (lightboxCounter) lightboxCounter.style.display = '';
    
    // 移除所有事件监听
    document.removeEventListener('keydown', handleLightboxKeydown);
    lightboxImage.removeEventListener('wheel', handleImageZoom);
    lightboxImage.removeEventListener('mousedown', handleImageDragStart);
    document.removeEventListener('mousemove', handleImageDrag);
    document.removeEventListener('mouseup', handleImageDragEnd);
}

// 上一张图片
function previousImage() {
    if (lightboxImages.length <= 1) return;
    
    currentImageIndex = (currentImageIndex - 1 + lightboxImages.length) % lightboxImages.length;
    updateLightboxImage();
}

// 下一张图片
function nextImage() {
    if (lightboxImages.length <= 1) return;
    
    currentImageIndex = (currentImageIndex + 1) % lightboxImages.length;
    updateLightboxImage();
}

// 更新灯箱中的图片
function updateLightboxImage() {
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxCounter = document.getElementById('lightboxCounter');
    
    // 重置缩放和位置
    currentZoom = 1;
    imageOffsetX = 0;
    imageOffsetY = 0;
    
    const currentImage = lightboxImages[currentImageIndex];
    lightboxImage.src = currentImage.src;
    lightboxImage.alt = currentImage.alt;
    updateImageTransform(lightboxImage);
    lightboxCounter.textContent = `${currentImageIndex + 1} / ${lightboxImages.length}`;
}

// 更新图片变换
function updateImageTransform(img) {
    img.style.transform = `scale(${currentZoom}) translate(${imageOffsetX}px, ${imageOffsetY}px)`;
}

// 处理图片缩放
function handleImageZoom(e) {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    currentZoom = Math.min(Math.max(0.5, currentZoom + delta), 5);
    
    const lightboxImage = document.getElementById('lightboxImage');
    updateImageTransform(lightboxImage);
}

// 处理拖拽开始
function handleImageDragStart(e) {
    if (currentZoom <= 1) return;
    isDragging = true;
    dragStartX = e.clientX - imageOffsetX;
    dragStartY = e.clientY - imageOffsetY;
    e.preventDefault();
}

// 处理拖拽
function handleImageDrag(e) {
    if (!isDragging) return;
    imageOffsetX = e.clientX - dragStartX;
    imageOffsetY = e.clientY - dragStartY;
    const lightboxImage = document.getElementById('lightboxImage');
    updateImageTransform(lightboxImage);
}

// 处理拖拽结束
function handleImageDragEnd() {
    isDragging = false;
}

// 处理键盘事件
function handleLightboxKeydown(event) {
    switch(event.key) {
        case 'Escape':
            closeLightbox();
            break;
        case 'ArrowLeft':
            previousImage();
            break;
        case 'ArrowRight':
            nextImage();
            break;
    }
}

// Emoji 选择器
const EMOJI_DATA = (
    '😀 😃 😄 😁 😆 😅 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 😋 😛 😜 🤪 😝 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 🙄 😏 😣 😥 😮 🤐 😯 😪 😫 🥱 😴 😌 😛 😜 😝 🤤 😒 😓 😔 😕 🙃 🥲 😬 🤥 😌 🙂 🤤 🤒 🤕 🤢 🤮 🤧 😷 🤒 🥵 🥶 🥴 😵 🤯 🤠 😎 🥸 🤓 🧐 😕 😟 🙁 ☹️ 😮 😯 😲 🥺 😳 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 💩 🤡 👹 👺 👻 👽 👾 🤖 🎃 🫠 🫥 🫢 🫡 🫣 🫤 '
    + '👍 👎 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👋 🤚 🖐️ ✋ 🖖 👊 🤛 🤜 👏 🙌 👐 🤲 🙏 ✍️ 💅 🤝 '
    + '❤️ 🧡 💛 💚 💙 💜 🤎 🖤 🤍 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 '
    + '⭐ ✨ ⚡ 🔥 🌈 ☀️ 🌤️ ⛅ ☁️ 🌧️ ⛈️ 🌩️ 🌨️ ❄️ 💧 💦 🌊 '
    + '🍏 🍎 🍐 🍊 🍋 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 '
    + '🍔 🌭 🍕 🥪 🌮 🌯 🥙 🧆 🍜 🍣 🍱 🥟 🥠 🧁 🍰 🍪 🍩 🍫 '
    + '⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓 🏸 🥅 ⛳ 🏒 🏑 🥍 🛼 🛹 '
).split(/\s+/).filter(Boolean);

function initEmojiPicker() {
    const btn = document.getElementById('emojiPickerBtn');
    const panel = document.getElementById('emojiPicker');
    const grid = document.getElementById('emojiGrid');
    const search = document.getElementById('emojiSearch');
    if (!btn || !panel || !grid) return;
    
    function renderEmojis(list) {
        grid.innerHTML = list.map(e => `<div class="emoji-item" data-emoji="${e}">${e}</div>`).join('');
    }
    renderEmojis(EMOJI_DATA);
    
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
    
    document.addEventListener('click', function(e) {
        if (panel.style.display === 'block' && !panel.contains(e.target) && e.target !== btn) {
            panel.style.display = 'none';
        }
    });
    
    grid.addEventListener('click', function(e) {
        const item = e.target.closest('.emoji-item');
        if (!item) return;
        const emoji = item.dataset.emoji;
        const textarea = document.getElementById('memoContent');
        if (textarea) {
            insertAtCursor(textarea, emoji);
            textarea.focus();
        }
    });
    
    if (search) {
        search.addEventListener('input', function() {
            const q = this.value.trim();
            if (!q) { renderEmojis(EMOJI_DATA); return; }
            const list = EMOJI_DATA.filter(e => e.includes(q));
            renderEmojis(list);
        });
    }
}

// 代码块复制功能
function addCopyButtonsToCodeBlocks(container) {
    const codeBlocks = container.querySelectorAll('pre code');
    
    codeBlocks.forEach(codeBlock => {
        const pre = codeBlock.parentElement;
        
        // 检查是否已经添加了复制按钮
        if (pre.querySelector('.code-copy-btn')) {
            return;
        }
        
        // 获取代码语言
        const language = getCodeLanguage(codeBlock);
        
        // 创建代码块包装器
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        
        // 创建头部
        const header = document.createElement('div');
        header.className = 'code-block-header';
        
        // 语言标签
        if (language) {
            const langLabel = document.createElement('span');
            langLabel.className = 'code-language';
            langLabel.textContent = language;
            header.appendChild(langLabel);
        }
        
        // 复制按钮
        const copyBtn = document.createElement('button');
        copyBtn.className = 'code-copy-btn';
        copyBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            复制
        `;
        
        copyBtn.addEventListener('click', function() {
            copyCodeToClipboard(codeBlock.textContent, copyBtn);
        });
        
        header.appendChild(copyBtn);
        wrapper.appendChild(header);
        
        // 替换原来的pre元素
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
        
        // 重新应用代码高亮到新的代码块
        if (typeof Prism !== 'undefined') {
            // 重新高亮
            Prism.highlightElement(codeBlock);
        }
    });
}

// 获取代码语言
function getCodeLanguage(codeElement) {
    // 从class中提取语言信息
    const classList = Array.from(codeElement.classList);
    const languageClass = classList.find(cls => cls.startsWith('language-'));
    
    if (languageClass) {
        return languageClass.replace('language-', '');
    }
    
    // 从父元素的class中查找
    const parentClassList = Array.from(codeElement.parentElement.classList);
    const parentLanguageClass = parentClassList.find(cls => cls.startsWith('language-'));
    
    if (parentLanguageClass) {
        return parentLanguageClass.replace('language-', '');
    }
    
    return null;
}

// 复制代码到剪贴板
async function copyCodeToClipboard(code, button) {
    try {
        await navigator.clipboard.writeText(code);
        
        // 显示复制成功状态
        button.classList.add('copied');
        
        // 2秒后恢复原状
        setTimeout(() => {
            button.classList.remove('copied');
        }, 2000);
        
    } catch (err) {
        // 如果现代API失败，使用传统方法
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            button.classList.add('copied');
            setTimeout(() => {
                button.classList.remove('copied');
            }, 2000);
        } catch (err) {
            console.error('复制失败:', err);
            showToast('复制失败，请手动选择代码复制', 'warning');
        }
        
        document.body.removeChild(textArea);
    }
}

// 清理空标签
async function cleanupEmptyTags() {
    if (!confirm('确定要清理所有空标签吗？这将删除没有关联任何笔记的标签。')) {
        return;
    }
    
    try {
        const response = await fetch('api.php?action=cleanup_tags', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(result.message, 'success');
            // 重新加载标签列表
            loadTags();
        } else {
            showToast('清理失败：' + (result.error || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('清理空标签失败:', error);
        showToast('清理失败：' + error.message, 'error');
    }
}

// 显示修改密码模态框
function showChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        modal.style.display = 'flex';
        // 清空表单
        document.getElementById('changePasswordForm').reset();
    }
}

// 隐藏修改密码模态框
function hideChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 显示网站设置模态框
function showSiteSettingsModal() {
    const modal = document.getElementById('siteSettingsModal');
    if (modal) {
        modal.style.display = 'flex';
        // 加载当前设置
        loadSiteSettings();
    }
}

// 隐藏网站设置模态框
function hideSiteSettingsModal() {
    const modal = document.getElementById('siteSettingsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 加载网站设置
async function loadSiteSettings() {
    try {
        const response = await fetch('api.php?action=site_settings');
        const result = await response.json();
        
        if (result.success) {
            const siteName = result.data.site_name || 'Memos';
            // 设置表单值
            const siteNameInput = document.getElementById('siteName');
            if (siteNameInput) {
                siteNameInput.value = siteName;
            }
            // 更新页面标题
            document.title = siteName + ' - 笔记管理系统';
        }
    } catch (error) {
        console.error('加载网站设置失败:', error);
    }
}

// 修改密码
async function changePassword() {
    const form = document.getElementById('changePasswordForm');
    const formData = new FormData(form);
    
    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');
    
    if (newPassword !== confirmPassword) {
        showToast('新密码和确认密码不匹配', 'warning');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('新密码长度至少6位', 'warning');
        return;
    }
    
    try {
        const response = await fetch('api.php?action=change_password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword: currentPassword,
                newPassword: newPassword
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('密码修改成功', 'success');
            hideChangePasswordModal();
        } else {
            showToast('密码修改失败：' + (result.error || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('修改密码失败:', error);
        showToast('修改密码失败：' + error.message, 'error');
    }
}

// 保存网站设置
async function saveSiteSettings() {
    const form = document.getElementById('siteSettingsForm');
    const formData = new FormData(form);
    
    const siteName = formData.get('siteName');
    
    if (!siteName.trim()) {
        showToast('网站名称不能为空', 'warning');
        return;
    }
    
    try {
        const response = await fetch('api.php?action=site_settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                site_name: siteName
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('设置保存成功', 'success');
            hideSiteSettingsModal();
            // 更新页面标题
            document.title = siteName + ' - 笔记管理系统';
        } else {
            showToast('设置保存失败：' + (result.error || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('保存网站设置失败:', error);
        showToast('保存设置失败：' + error.message, 'error');
    }
}

// 处理登出（移动端先关闭侧边栏）
function handleLogout() {
    // 移动端：先关闭侧边栏
    if (window.innerWidth <= 768) {
        closeMobileSidebar();
    }
    
    // 延迟一下再执行登出，让关闭动画完成
    setTimeout(() => {
        logout();
    }, 100);
}

// 登出
async function logout() {
    if (!confirm('确定要登出吗？')) {
        return;
    }
    
    try {
        const response = await fetch('api.php?action=logout', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 跳转到登录页面
            window.location.href = 'login.php';
        } else {
            showToast('登出失败：' + (result.error || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('登出失败:', error);
        // 即使API调用失败，也跳转到登录页面
        window.location.href = 'login.php';
    }
}

// 显示修改用户名模态框
function showChangeUsernameModal() {
    const modal = document.getElementById('changeUsernameModal');
    if (modal) {
        modal.style.display = 'flex';
        loadCurrentUsername();
    }
}

// 隐藏修改用户名模态框
function hideChangeUsernameModal() {
    const modal = document.getElementById('changeUsernameModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 加载当前用户名
async function loadCurrentUsername() {
    try {
        const response = await fetch('api.php?action=user_info');
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('newUsername').value = result.data.username || '';
        }
    } catch (error) {
        console.error('加载用户名失败:', error);
    }
}

// 修改用户名
async function changeUsername() {
    const form = document.getElementById('changeUsernameForm');
    const formData = new FormData(form);
    
    const newUsername = formData.get('newUsername');
    
    if (!newUsername.trim()) {
        showToast('用户名不能为空', 'warning');
        return;
    }
    
    if (newUsername.length < 3) {
        showToast('用户名长度至少3位', 'warning');
        return;
    }
    
    try {
        const response = await fetch('api.php?action=change_username', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: newUsername
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('用户名修改成功', 'success');
            hideChangeUsernameModal();
        } else {
            showToast('用户名修改失败：' + (result.error || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('修改用户名失败:', error);
        showToast('修改用户名失败：' + error.message, 'error');
    }
}

// 显示上传备份模态框
function showUploadBackupModal() {
    const modal = document.getElementById('uploadBackupModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// 隐藏上传备份模态框
function hideUploadBackupModal() {
    const modal = document.getElementById('uploadBackupModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 上传备份文件（仅验证和保存）
async function uploadBackupFile(input) {
    const file = input.files[0];
    
    if (!file) {
        return;
    }
    
    if (!file.name.endsWith('.db')) {
        showToast('请选择.db格式的数据库备份文件', 'warning');
        input.value = ''; // 清空文件选择
        return;
    }
    
    // 检查文件大小（50MB限制）
    if (file.size > 50 * 1024 * 1024) {
        showToast('文件过大，请选择小于50MB的备份文件', 'warning');
        input.value = ''; // 清空文件选择
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('backupFile', file);
        
        const response = await fetch('api.php?action=upload_backup_file', {
            method: 'POST',
            body: formData
        });
        
        // 检查响应状态
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // 获取响应文本
        const responseText = await response.text();
        console.log('API响应:', responseText);
        
        // 尝试解析JSON
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON解析失败:', parseError);
            console.error('响应内容:', responseText);
            throw new Error('服务器返回了无效的响应格式');
        }
        
        if (result.success) {
            showToast(result.message || '备份文件上传成功', 'success');
            // 刷新备份列表
            await loadBackupList();
        } else {
            showToast('上传失败：' + (result.error || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('上传备份失败:', error);
        showToast('上传失败：' + error.message, 'error');
    } finally {
        // 清空文件选择
        input.value = '';
    }
}

// 上传备份（恢复数据库）
async function uploadBackup() {
    const form = document.getElementById('uploadBackupForm');
    const formData = new FormData(form);
    
    const file = formData.get('backupFile');
    
    if (!file || file.size === 0) {
        showToast('请选择备份文件', 'warning');
        return;
    }
    
    if (!file.name.endsWith('.db')) {
        showToast('请选择.db格式的数据库备份文件', 'warning');
        return;
    }
    
    if (!confirm('上传备份将覆盖当前所有数据，确定要继续吗？')) {
        return;
    }
    
    try {
        const response = await fetch('api.php?action=upload_backup', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(result.message || '备份恢复成功', 'success');
            hideUploadBackupModal();
            // 刷新页面
            window.location.reload();
        } else {
            showToast('备份恢复失败：' + (result.error || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('上传备份失败:', error);
        showToast('上传备份失败：' + error.message, 'error');
    }
}

// 切换更多菜单显示/隐藏
function toggleMoreMenu(memoId) {
    // 关闭所有其他下拉菜单
    document.querySelectorAll('.more-dropdown').forEach(dropdown => {
        if (dropdown.id !== `more-dropdown-${memoId}`) {
            dropdown.classList.remove('show');
        }
    });
    
    // 切换当前下拉菜单
    const dropdown = document.getElementById(`more-dropdown-${memoId}`);
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// 复制笔记内容
async function copyMemoContent(memoId) {
    try {
        // 获取笔记内容
        const response = await fetch(`api.php?action=memo&id=${memoId}`);
        const result = await response.json();
        
        if (result.data) {
            let content = result.data.content;
            
            // 将相对图片链接转换为绝对链接
            const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
            content = convertRelativeImageLinks(content, baseUrl);
            
            // 复制到剪贴板
            await navigator.clipboard.writeText(content);
            showToast('内容已复制到剪贴板', 'success');
            
            // 关闭下拉菜单
            const dropdown = document.getElementById(`more-dropdown-${memoId}`);
            if (dropdown) {
                dropdown.classList.remove('show');
            }
        } else {
            showToast('获取笔记内容失败', 'error');
        }
    } catch (error) {
        console.error('复制失败:', error);
        showToast('复制失败，请重试', 'error');
    }
}

// 导出笔记为Markdown文件
async function exportMemoAsMarkdown(memoId) {
    try {
        // 获取笔记内容
        const response = await fetch(`api.php?action=memo&id=${memoId}`);
        const result = await response.json();
        
        if (result.data) {
            const memo = result.data;
            let content = memo.content;
            
            // 将相对图片链接转换为绝对链接
            const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
            content = convertRelativeImageLinks(content, baseUrl);
            
            // 创建Markdown文件内容（只包含标签和内容）
            const tags = memo.tags && memo.tags.length > 0 
                ? memo.tags.map(tag => `#${tag.name}`).join(' ') 
                : '';
            
            let markdownContent = '';
            if (tags) {
                markdownContent += `${tags}\n\n`;
            }
            markdownContent += content;
            
            // 生成文件名
            const date = new Date(memo.created_at).toISOString().split('T')[0];
            const filename = `memo_${date}_${memoId}.md`;
            
            // 下载文件
            downloadFile(markdownContent, filename, 'text/markdown');
            showToast('Markdown文件已下载', 'success');
            
            // 关闭下拉菜单
            const dropdown = document.getElementById(`more-dropdown-${memoId}`);
            if (dropdown) {
                dropdown.classList.remove('show');
            }
        } else {
            showToast('获取笔记内容失败', 'error');
        }
    } catch (error) {
        console.error('导出失败:', error);
        showToast('导出失败，请重试', 'error');
    }
}

// 将相对图片链接转换为绝对链接
function convertRelativeImageLinks(content, baseUrl) {
    // 匹配Markdown图片语法 ![alt](url)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    
    return content.replace(imageRegex, (match, alt, url) => {
        // 如果URL已经是绝对链接（以http://或https://开头），直接返回
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return match;
        }
        
        // 如果URL以/开头，直接拼接baseUrl
        if (url.startsWith('/')) {
            return `![${alt}](${baseUrl}${url})`;
        }
        
        // 如果是相对路径，拼接baseUrl和uploads路径
        if (url.startsWith('uploads/') || url.startsWith('./uploads/')) {
            const cleanUrl = url.replace(/^\.\//, '');
            return `![${alt}](${baseUrl}/${cleanUrl})`;
        }
        
        // 其他情况，假设是相对于uploads的路径
        return `![${alt}](${baseUrl}/uploads/${url})`;
    });
}

// 分享功能
let currentShareMemoId = null;

function shareMemo(memoId) {
    currentShareMemoId = memoId;
    openShareModal();
}

function openShareModal() {
    const modal = document.getElementById('shareModal');
    if (!modal) return;
    modal.style.display = 'flex';

    // 初始化表单默认值
    const encryptedCheckbox = document.getElementById('shareEncrypted');
    const passcodeInput = document.getElementById('sharePasscode');
    const expiresNever = document.getElementById('shareExpireNever');
    const expiresAtRadio = document.getElementById('shareExpireAt');
    const expiresAtInput = document.getElementById('shareExpireAtInput');
    const linkInput = document.getElementById('shareLink');
    const copyAllGroup = document.getElementById('copyAllGroup');

    if (encryptedCheckbox) encryptedCheckbox.checked = false;
    if (passcodeInput) {
        passcodeInput.value = generateRandomCode(5);
        passcodeInput.disabled = true; // 默认加密未勾选时禁用
    }
    const passCopyBtn = document.getElementById('sharePasscodeCopyBtn');
    if (passCopyBtn) passCopyBtn.disabled = true;
    if (expiresNever) expiresNever.checked = true;
    if (expiresAtInput) {
        expiresAtInput.value = '';
        expiresAtInput.disabled = true;
    }
    if (linkInput) linkInput.value = '';
    if (copyAllGroup) copyAllGroup.style.display = 'none'; // 默认隐藏"复制全部"按钮
}

function hideShareModal() {
    const modal = document.getElementById('shareModal');
    if (modal) modal.style.display = 'none';
}

// 监听加密勾选切换
document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'shareEncrypted') {
        const enabled = e.target.checked;
        const passInput = document.getElementById('sharePasscode');
        const passCopyBtn = document.getElementById('sharePasscodeCopyBtn');
        
        if (passInput) {
            passInput.disabled = !enabled;
            if (enabled && !passInput.value) {
                passInput.value = generateRandomCode(5);
            }
        }
        if (passCopyBtn) passCopyBtn.disabled = !enabled;
    }
});

// 监听编辑分享过期类型切换
document.addEventListener('change', function(e) {
    if (e.target && (e.target.id === 'editShareExpireNever' || e.target.id === 'editShareExpireAt')) {
        const isAt = document.getElementById('editShareExpireAt');
        const input = document.getElementById('editShareExpireAtInput');
        if (input) {
            input.disabled = !(isAt && isAt.checked);
        }
    }
});

// 监听过期类型切换
document.addEventListener('change', function(e) {
    if (e.target && (e.target.id === 'shareExpireNever' || e.target.id === 'shareExpireAt')) {
        const isAt = document.getElementById('shareExpireAt').checked;
        const input = document.getElementById('shareExpireAtInput');
        if (input) input.disabled = !isAt;
    }
});

function generateRandomCode(length = 5) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function copySharePasscode() {
    const input = document.getElementById('sharePasscode');
    if (!input || input.disabled || !input.value) return;
    navigator.clipboard.writeText(input.value).then(() => {
        showToast('分享码已复制', 'success');
    }).catch(() => {
        showToast('复制失败，请手动复制', 'warning');
    });
}

function copyShareLink() {
    const linkInput = document.getElementById('shareLink');
    if (linkInput && linkInput.value) {
        navigator.clipboard.writeText(linkInput.value).then(() => {
            showToast('分享链接已复制', 'success');
        }).catch(() => {
            showToast('复制失败，请手动复制', 'warning');
        });
    }
}

async function createShareLink() {
    if (!currentShareMemoId) return;

    const encrypted = document.getElementById('shareEncrypted')?.checked || false;
    let passcode = '';
    if (encrypted) {
        passcode = (document.getElementById('sharePasscode')?.value || '').trim();
        if (!passcode) {
            showToast('请填写分享码或取消加密分享', 'warning');
            return;
        }
    }

    let expiresAt = null;
    const useExpireAt = document.getElementById('shareExpireAt')?.checked || false;
    if (useExpireAt) {
        const dt = document.getElementById('shareExpireAtInput')?.value || '';
        if (!dt) {
            showToast('请选择过期时间或选择“永不过期”', 'warning');
            return;
        }
        // datetime-local -> YYYY-MM-DD HH:MM
        const serverFmt = dt.replace('T', ' ').slice(0, 16);
        expiresAt = serverFmt;
    }

    try {
        const res = await fetch('api.php?action=create_share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                memo_id: currentShareMemoId,
                encrypted: encrypted ? 1 : 0,
                passcode: encrypted ? passcode : '',
                expires_at: expiresAt,
                max_visits: (function(){
                    const v = document.getElementById('shareMaxVisits')?.value || '';
                    const n = parseInt(v, 10);
                    return (isNaN(n) || n <= 0) ? null : n;
                })()
            })
        });
        const result = await res.json();
        if (!result.success) {
            showToast('创建分享失败：' + (result.error || '未知错误'), 'error');
            return;
        }

        const token = result.data.token;
        const base = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
        const link = `${base}/share.php?token=${encodeURIComponent(token)}`;
        const linkInput = document.getElementById('shareLink');
        if (linkInput) linkInput.value = link;
        
        // 显示"复制全部"按钮（仅加密分享）
        const copyAllGroup = document.getElementById('copyAllGroup');
        if (copyAllGroup) {
            copyAllGroup.style.display = encrypted ? 'block' : 'none';
        }
        
        showToast('分享已创建', 'success');
    } catch (err) {
        console.error(err);
        showToast('创建分享失败：' + (err.message || '网络错误'), 'error');
    }
}

// 复制全部分享信息（链接+提取码+说明）
function copyAllShareInfo() {
    const linkInput = document.getElementById('shareLink');
    const passcodeInput = document.getElementById('sharePasscode');
    const encryptedCheckbox = document.getElementById('shareEncrypted');
    
    if (!linkInput || !linkInput.value) {
        showToast('请先生成分享链接', 'warning');
        return;
    }
    
    // 检查是否为加密分享
    if (!encryptedCheckbox || !encryptedCheckbox.checked) {
        showToast('复制全部功能仅适用于加密分享', 'warning');
        return;
    }
    
    const link = linkInput.value;
    const passcode = passcodeInput ? passcodeInput.value : '';
    
    if (!passcode) {
        showToast('未找到提取码', 'warning');
        return;
    }
    
    // 拼接分享文本
    const shareText = `🔗 分享链接：\n${link}\n\n🔒 提取码：${passcode}\n\n💡 说明：请妥善保管提取码，访问分享链接时需要输入。`;
    
    // 复制到剪贴板
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareText).then(() => {
            showToast('已复制分享链接、提取码和说明！', 'success');
        }).catch((err) => {
            console.error('复制失败:', err);
            showToast('复制失败，请手动复制', 'warning');
            prompt('请手动复制以下内容:', shareText);
        });
    } else {
        // 降级方案
        showToast('浏览器不支持自动复制，请手动复制', 'info');
        prompt('请手动复制以下内容:', shareText);
    }
}

// 点击外部关闭下拉菜单
document.addEventListener('click', function(event) {
    // 检查点击是否在下拉菜单外部
    if (!event.target.closest('.memo-more-menu')) {
        document.querySelectorAll('.more-dropdown').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    }
    
    // 检查点击是否在排序下拉框外部
    if (!event.target.closest('.sort-dropdown-container')) {
        const sortDropdown = document.getElementById('sortDropdown');
        if (sortDropdown) {
            sortDropdown.style.display = 'none';
        }
    }
});

// 添加事件监听器
document.addEventListener('DOMContentLoaded', async function() {
    // 初始化主题
    initTheme();
    
    // 加载用户偏好设置
    await loadUserPreferences();
    
    // 加载网站设置
    loadSiteSettings();
    
    // 移动端标签输入框事件
    const mobileTagsInput = document.getElementById('mobileTagsInput');
    if (mobileTagsInput) {
        mobileTagsInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const value = this.value.trim();
                if (value) {
                    addMobileTag(value);
                    this.value = '';
                }
            } else if (e.key === ' ') {
                e.preventDefault();
                const value = this.value.trim();
                if (value) {
                    addMobileTag(value);
                    this.value = '';
                }
            } else if (e.key === 'Backspace' && this.value === '' && mobileTags.length > 0) {
                removeMobileTag(mobileTags.length - 1);
            }
        });
    }
    
    // 修改用户名表单
    const changeUsernameForm = document.getElementById('changeUsernameForm');
    if (changeUsernameForm) {
        changeUsernameForm.addEventListener('submit', function(e) {
            e.preventDefault();
            changeUsername();
        });
    }
    
    // 上传备份表单
    const uploadBackupForm = document.getElementById('uploadBackupForm');
    if (uploadBackupForm) {
        uploadBackupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            uploadBackup();
        });
    }
    
    // 初始化悬浮菜单
    initFloatMenu();
});

// ==================== 分页数设置功能 ====================

// 用户偏好设置缓存
let userPreferences = {
    items_per_page: 20,
    max_memo_height: 0,
    loaded: false
};

// 加载用户偏好设置
async function loadUserPreferences() {
    if (userPreferences.loaded) {
        return userPreferences;
    }
    
    try {
        const response = await fetch('api.php?action=user_preferences');
        const result = await response.json();
        
        if (result.success) {
            userPreferences.items_per_page = result.data.items_per_page;
            userPreferences.max_memo_height = result.data.max_memo_height;
            userPreferences.loaded = true;
        }
    } catch (error) {
        console.error('加载用户偏好设置失败:', error);
    }
    
    return userPreferences;
}

// 获取每页显示数量
function getItemsPerPage() {
    return userPreferences.items_per_page || 20;
}

// 保存每页显示数量
async function saveItemsPerPage() {
    const input = document.getElementById('itemsPerPageInput');
    const value = parseInt(input.value);
    
    if (value < 5 || value > 100) {
        showToast('每页显示数量必须在 5 到 100 之间', 'warning');
        return;
    }
    
    try {
        const response = await fetch('api.php?action=user_preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items_per_page: value
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            userPreferences.items_per_page = value;
            showToast('保存成功！', 'success');
            
            // 重新加载当前视图
            if (currentView === 'timeline') {
                currentPage = 1;
                hasMoreData = true;
                loadMemos('', false);
            }
        } else {
            showToast('保存失败：' + result.error, 'error');
        }
    } catch (error) {
        console.error('保存设置失败:', error);
        showToast('保存失败：' + error.message, 'error');
    }
}

// 获取文章最大显示高度
function getMaxMemoHeight() {
    return userPreferences.max_memo_height || 0;
}

// 保存文章最大显示高度
async function saveMaxMemoHeight() {
    const input = document.getElementById('maxMemoHeightInput');
    const value = parseInt(input.value) || 0;
    
    if (value < 0 || value > 5000) {
        showToast('文章最大显示高度必须在 0 到 5000 之间', 'warning');
        return;
    }
    
    try {
        const response = await fetch('api.php?action=user_preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                max_memo_height: value
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            userPreferences.max_memo_height = value;
            showToast('保存成功！刷新页面后生效', 'success');
        } else {
            showToast('保存失败：' + result.error, 'error');
        }
    } catch (error) {
        console.error('保存设置失败:', error);
        showToast('保存失败：' + error.message, 'error');
    }
}

// ==================== 主题切换功能 ====================

let systemThemeMediaQuery = null;

// 初始化主题
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    
    // 监听系统主题变化
    if (window.matchMedia) {
        systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        systemThemeMediaQuery.addEventListener('change', handleSystemThemeChange);
    }
}

// 应用主题
function applyTheme(theme) {
    const htmlElement = document.documentElement;
    
    if (theme === 'auto') {
        // 跟随系统
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        htmlElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    } else {
        // 亮色或暗色
        htmlElement.setAttribute('data-theme', theme);
    }
}

// 切换主题
function changeTheme(theme) {
    localStorage.setItem('theme', theme);
    applyTheme(theme);
    
    // 更新设置页面的按钮状态
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 根据theme值添加active类
    const themeButtons = document.querySelectorAll('.theme-option');
    if (theme === 'light' && themeButtons[0]) {
        themeButtons[0].classList.add('active');
    } else if (theme === 'dark' && themeButtons[1]) {
        themeButtons[1].classList.add('active');
    } else if (theme === 'auto' && themeButtons[2]) {
        themeButtons[2].classList.add('active');
    }
}

// 处理系统主题变化
function handleSystemThemeChange(e) {
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'auto') {
        applyTheme('auto');
    }
}

// ==================== 悬浮菜单和页面跳转功能 ====================

let isPageJumperOpen = false;
let totalPagesCount = 1;
let currentTotalMemos = 0; // 当前搜索/筛选条件下的总笔记数
let isSliderDragging = false;
let sliderStartY = 0;
let thumbStartY = 0;

// 初始化悬浮菜单
function initFloatMenu() {
    const backToTopBtn = document.getElementById('backToTopBtn');
    const pageJumpBtn = document.getElementById('pageJumpBtn');
    const closeJumperBtn = document.getElementById('closeJumperBtn');
    const pageJumper = document.getElementById('pageJumper');
    const sliderThumb = document.getElementById('sliderThumb');
    const sliderTrack = document.querySelector('.slider-track');
    const jumpToPageBtn = document.getElementById('jumpToPageBtn');
    const pageInput = document.getElementById('pageInput');
    
    // 返回顶部
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    // 打开/关闭页面跳转控件
    if (pageJumpBtn) {
        pageJumpBtn.addEventListener('click', () => {
            togglePageJumper();
        });
    }
    
    if (closeJumperBtn) {
        closeJumperBtn.addEventListener('click', () => {
            closePageJumper();
        });
    }
    
    // 滚动条拖动
    if (sliderThumb && sliderTrack) {
        sliderThumb.addEventListener('mousedown', startDrag);
        sliderTrack.addEventListener('click', handleTrackClick);
    }
    
    // 跳转按钮
    if (jumpToPageBtn) {
        jumpToPageBtn.addEventListener('click', () => {
            jumpToPage();
        });
    }
    
    // 输入框回车跳转
    if (pageInput) {
        pageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                jumpToPage();
            }
        });
    }
    
    // 显示/隐藏返回顶部按钮
    window.addEventListener('scroll', () => {
        if (backToTopBtn) {
            if (window.pageYOffset > 300) {
                backToTopBtn.style.display = 'flex';
            } else {
                backToTopBtn.style.display = 'none';
            }
        }
    });
}

// 切换页面跳转控件
function togglePageJumper() {
    const pageJumper = document.getElementById('pageJumper');
    if (isPageJumperOpen) {
        closePageJumper();
    } else {
        openPageJumper();
    }
}

// 打开页面跳转控件
function openPageJumper() {
    const pageJumper = document.getElementById('pageJumper');
    if (pageJumper) {
        pageJumper.classList.add('active');
        isPageJumperOpen = true;
        updatePageJumperInfo();
    }
}

// 关闭页面跳转控件
function closePageJumper() {
    const pageJumper = document.getElementById('pageJumper');
    if (pageJumper) {
        pageJumper.classList.remove('active');
        isPageJumperOpen = false;
    }
}

// 更新页面跳转信息
function updatePageJumperInfo() {
    const memosPerPage = getItemsPerPage();
    
    // 如果有当前搜索/筛选的总数，使用它；否则从API获取
    if (currentTotalMemos > 0) {
        // 使用当前搜索/筛选结果的总数
        totalPagesCount = Math.ceil(currentTotalMemos / memosPerPage);
        
        // 更新显示
        document.getElementById('currentPageNum').textContent = currentPage;
        document.getElementById('totalPages').textContent = totalPagesCount;
        document.getElementById('totalPageLabel').textContent = totalPagesCount;
        document.getElementById('pageInput').setAttribute('max', totalPagesCount);
        
        // 更新滑块位置
        updateSliderPosition();
    } else {
        // 没有搜索条件时，从API获取总笔记数
        fetch('api.php?action=stats')
            .then(response => response.json())
            .then(result => {
                if (result.data && result.data.total_memos) {
                    currentTotalMemos = result.data.total_memos;
                    totalPagesCount = Math.ceil(result.data.total_memos / memosPerPage);
                } else {
                    totalPagesCount = Math.max(1, currentPage);
                }
                
                // 更新显示
                document.getElementById('currentPageNum').textContent = currentPage;
                document.getElementById('totalPages').textContent = totalPagesCount;
                document.getElementById('totalPageLabel').textContent = totalPagesCount;
                document.getElementById('pageInput').setAttribute('max', totalPagesCount);
                
                // 更新滑块位置
                updateSliderPosition();
            })
            .catch(() => {
                totalPagesCount = Math.max(1, currentPage);
                document.getElementById('totalPages').textContent = totalPagesCount;
                document.getElementById('totalPageLabel').textContent = totalPagesCount;
            });
    }
}

// 更新滑块位置
function updateSliderPosition() {
    const sliderThumb = document.getElementById('sliderThumb');
    const sliderTrack = document.querySelector('.slider-track');
    
    if (sliderThumb && sliderTrack) {
        const trackHeight = sliderTrack.offsetHeight;
        const percentage = (currentPage - 1) / (totalPagesCount - 1);
        const position = percentage * trackHeight;
        
        sliderThumb.style.top = Math.max(0, Math.min(position, trackHeight)) + 'px';
    }
}

// 开始拖动
function startDrag(e) {
    e.preventDefault();
    isSliderDragging = true;
    sliderStartY = e.clientY;
    thumbStartY = parseInt(document.getElementById('sliderThumb').style.top) || 0;
    
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
}

// 拖动中
function onDrag(e) {
    if (!isSliderDragging) return;
    
    const sliderTrack = document.querySelector('.slider-track');
    const sliderThumb = document.getElementById('sliderThumb');
    const trackHeight = sliderTrack.offsetHeight;
    
    const deltaY = e.clientY - sliderStartY;
    let newTop = thumbStartY + deltaY;
    
    // 限制范围
    newTop = Math.max(0, Math.min(newTop, trackHeight));
    sliderThumb.style.top = newTop + 'px';
    
    // 计算对应的页码
    const percentage = newTop / trackHeight;
    const targetPage = Math.round(percentage * (totalPagesCount - 1)) + 1;
    
    // 更新页码显示
    document.getElementById('currentPageNum').textContent = targetPage;
}

// 停止拖动
function stopDrag() {
    if (isSliderDragging) {
        isSliderDragging = false;
        
        // 计算最终页码并跳转
        const sliderTrack = document.querySelector('.slider-track');
        const sliderThumb = document.getElementById('sliderThumb');
        const trackHeight = sliderTrack.offsetHeight;
        const thumbTop = parseInt(sliderThumb.style.top) || 0;
        const percentage = thumbTop / trackHeight;
        const targetPage = Math.round(percentage * (totalPagesCount - 1)) + 1;
        
        jumpToSpecificPage(targetPage);
    }
    
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
}

// 点击轨道跳转
function handleTrackClick(e) {
    if (e.target.classList.contains('slider-thumb')) return;
    
    const sliderTrack = document.querySelector('.slider-track');
    const rect = sliderTrack.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const trackHeight = sliderTrack.offsetHeight;
    const percentage = clickY / trackHeight;
    const targetPage = Math.round(percentage * (totalPagesCount - 1)) + 1;
    
    jumpToSpecificPage(targetPage);
}

// 从输入框跳转
function jumpToPage() {
    const pageInput = document.getElementById('pageInput');
    const targetPage = parseInt(pageInput.value);
    
    if (targetPage && targetPage >= 1 && targetPage <= totalPagesCount) {
        jumpToSpecificPage(targetPage);
        pageInput.value = '';
    } else {
        alert(`请输入 1 到 ${totalPagesCount} 之间的页码`);
    }
}

// 跳转到指定页面
function jumpToSpecificPage(targetPage) {
    if (targetPage < 1 || targetPage > totalPagesCount) return;
    
    currentPage = targetPage;
    hasMoreData = currentPage < totalPagesCount;
    
    // 重新加载数据
    loadMemos('', false);
    
    // 更新显示
    document.getElementById('currentPageNum').textContent = currentPage;
    updateSliderPosition();
    
    // 滚动到顶部
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// ==================== API Token 管理功能 ====================

// HTML转义函数
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

// 显示 API Tokens 管理
async function showApiTokensManagement() {
    const modal = document.getElementById('apiTokensModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        await loadApiTokens();
    }
}

// 隐藏 API Tokens 管理
function hideApiTokensModal() {
    const modal = document.getElementById('apiTokensModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// 加载 API Tokens 列表
async function loadApiTokens() {
    const container = document.getElementById('apiTokensList');
    if (!container) return;
    
    try {
        const response = await fetch('api.php?action=api_tokens');
        const result = await response.json();
        
        if (result.success && result.data) {
            const tokens = result.data;
            
            if (tokens.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="padding: 40px; text-align: center;">
                        <p style="color: var(--text-secondary);">暂无 API Token</p>
                    </div>
                `;
                return;
            }
            
            let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
            
            tokens.forEach(token => {
                const isExpired = token.expires_at && new Date(token.expires_at) < new Date();
                const expiresText = token.expires_at ? 
                    new Date(token.expires_at).toLocaleString('zh-CN', {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'}) : 
                    '永不过期';
                const lastUsedText = token.last_used_at ? 
                    new Date(token.last_used_at).toLocaleString('zh-CN', {month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'}) : 
                    '从未使用';
                const createdText = new Date(token.created_at).toLocaleString('zh-CN', {month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'});
                
                html += `
                    <div style="background: var(--sidebar-bg); padding: 12px; border-radius: 6px; border: 1px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                            <div style="flex: 1; min-width: 0;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                                    <h4 style="margin: 0; color: var(--text-primary); font-size: 14px; font-weight: 600;">${escapeHtml(token.name)}</h4>
                                    ${!token.is_active || isExpired ? 
                                        `<span style="padding: 2px 8px; background: #dc3545; color: white; border-radius: 3px; font-size: 11px; white-space: nowrap;">${isExpired ? '已过期' : '已禁用'}</span>` : 
                                        `<span style="padding: 2px 8px; background: #28a745; color: white; border-radius: 3px; font-size: 11px; white-space: nowrap;">活跃</span>`
                                    }
                                </div>
                                <div style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: var(--text-muted);">
                                    <span title="创建时间">📅 ${createdText}</span>
                                    <span title="过期时间">⏰ ${expiresText}</span>
                                    <span title="最后使用">🕐 ${lastUsedText}</span>
                                </div>
                            </div>
                            <div style="display: flex; gap: 6px; flex-shrink: 0;">
                                <button class="btn-secondary btn-sm" onclick="copyTokenValue(${token.id}, '${escapeHtml(token.name).replace(/'/g, '\\\'')}')" style="background: #667eea; color: white; border: none; padding: 6px 12px; font-size: 12px; white-space: nowrap;" title="复制Token">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                    复制
                                </button>
                                <button class="btn-secondary btn-sm" onclick="deleteApiToken(${token.id}, '${escapeHtml(token.name).replace(/'/g, '\\\'')}')" style="background: #dc3545; color: white; border: none; padding: 6px 12px; font-size: 12px; white-space: nowrap;">删除</button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            container.innerHTML = html;
            
        } else {
            showToast('加载失败: ' + (result.error || '未知错误'), 'error');
            container.innerHTML = '<div class="empty-state"><p>加载失败</p></div>';
        }
    } catch (error) {
        console.error('加载 API Tokens 失败:', error);
        showToast('加载失败', 'error');
        container.innerHTML = '<div class="empty-state"><p>加载失败</p></div>';
    }
}

// 显示创建 Token 模态框
function showCreateApiTokenModal() {
    const modal = document.getElementById('createApiTokenModal');
    if (modal) {
        modal.style.display = 'flex';
        
        // 重置表单
        document.getElementById('createApiTokenForm').reset();
        
        // 设置表单提交事件
        const form = document.getElementById('createApiTokenForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            await createApiToken();
        };
    }
}

// 隐藏创建 Token 模态框
function hideCreateApiTokenModal() {
    const modal = document.getElementById('createApiTokenModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 创建 API Token
async function createApiToken() {
    const name = document.getElementById('tokenName').value.trim();
    const expiresIn = parseInt(document.getElementById('tokenExpires').value);
    
    if (!name) {
        showToast('请输入 Token 名称', 'error');
        return;
    }
    
    try {
        const response = await fetch('api.php?action=api_tokens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                expires_in: expiresIn
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            hideCreateApiTokenModal();
            showToast('Token 创建成功', 'success');
            
            // 显示生成的 token
            showGeneratedToken(result.data.token);
            
            // 重新加载列表
            await loadApiTokens();
        } else {
            showToast('创建失败: ' + (result.error || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('创建 Token 失败:', error);
        showToast('创建失败', 'error');
    }
}

// 显示生成的 Token
function showGeneratedToken(token) {
    const modal = document.getElementById('showTokenModal');
    const tokenInput = document.getElementById('generatedToken');
    const exampleTextarea = document.getElementById('apiUsageExample');
    
    if (modal && tokenInput && exampleTextarea) {
        tokenInput.value = token;
        
        // 生成使用示例
        const baseUrl = window.location.origin + window.location.pathname.replace('index.php', '');
        const example = `curl -X POST ${baseUrl}api.php?action=/api/v1/memos \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -d '{
    "content": "# 我的笔记\\n\\n这是通过 API 创建的笔记",
    "visibility": "VISIBILITY_UNSPECIFIED",
    "tags": ["api", "test"]
  }'`;
        
        exampleTextarea.value = example;
        
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// 隐藏生成的 Token 模态框
function hideShowTokenModal() {
    const modal = document.getElementById('showTokenModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// 复制生成的 Token
function copyGeneratedToken() {
    const tokenInput = document.getElementById('generatedToken');
    if (tokenInput) {
        tokenInput.select();
        document.execCommand('copy');
        showToast('Token 已复制到剪贴板', 'success');
    }
}

// 复制 Token 值
async function copyTokenValue(tokenId, tokenName) {
    try {
        // 从服务器获取完整的token值
        const response = await fetch(`api.php?action=api_token&id=${tokenId}`);
        const result = await response.json();
        
        if (result.success && result.data && result.data.token) {
            // 复制到剪贴板
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(result.data.token);
                showToast(`Token "${tokenName}" 已复制到剪贴板`, 'success');
            } else {
                // 降级方案：使用传统方法
                const textarea = document.createElement('textarea');
                textarea.value = result.data.token;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                showToast(`Token "${tokenName}" 已复制到剪贴板`, 'success');
            }
        } else {
            showToast('无法获取Token值，请在创建时复制', 'error');
        }
    } catch (error) {
        console.error('复制 Token 失败:', error);
        showToast('复制失败', 'error');
    }
}

// 删除 API Token
async function deleteApiToken(tokenId, tokenName) {
    if (!confirm(`确定要删除 Token "${tokenName}" 吗？此操作不可恢复。`)) {
        return;
    }
    
    try {
        const response = await fetch(`api.php?action=api_token&id=${tokenId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Token 已删除', 'success');
            await loadApiTokens();
        } else {
            showToast('删除失败: ' + (result.error || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('删除 Token 失败:', error);
        showToast('删除失败', 'error');
    }
}


