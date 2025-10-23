<?php
/**
 * 主入口文件 - 完全避免重定向
 * 直接访问：http://localhost:8080/
 */

session_start();

// 禁用所有重定向和输出缓冲
if (ob_get_level()) {
    ob_end_clean();
}

// 检查是否已安装
$configFile = 'config.php';
if (!file_exists($configFile)) {
    // 未安装，显示安装提示页面
    ?>
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Memos - 需要安装</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .container {
                background: white;
                border-radius: 12px;
                padding: 40px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                max-width: 500px;
                width: 100%;
                text-align: center;
            }
            h1 { color: #333; margin-bottom: 20px; font-size: 2.5em; }
            p { color: #666; margin-bottom: 30px; font-size: 1.1em; }
            .btn {
                display: inline-block;
                padding: 15px 30px;
                background: #667eea;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-size: 1.1em;
                font-weight: 600;
                margin: 10px;
                transition: all 0.3s;
            }
            .btn:hover { 
                background: #5568d3; 
                transform: translateY(-2px);
            }
            .features {
                text-align: left;
                margin: 20px 0;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 8px;
            }
            .features h3 { margin-bottom: 15px; color: #333; }
            .features ul { list-style: none; padding: 0; }
            .features li { 
                padding: 5px 0; 
                color: #666;
            }
            .features li:before {
                content: "✓ ";
                color: #28a745;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📝 Memos</h1>
            <p>轻量级笔记管理系统</p>
            
            <div class="features">
                <h3>✨ 功能特性</h3>
                <ul>
                    <li>Markdown 语法支持</li>
                    <li>代码语法高亮</li>
                    <li>标签管理系统</li>
                    <li>图片和附件上传</li>
                    <li>全文搜索</li>
                    <li>笔记置顶</li>
                    <li>统计分析</li>
                    <li>响应式设计</li>
                </ul>
            </div>
            
            <a href="install.php" class="btn">开始安装</a>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// 已安装，加载配置
if (file_exists($configFile)) {
    require_once $configFile;
    require_once 'includes/functions.php';
    
    // 获取网站名称
    $siteName = 'Memos'; // 默认值
    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT value FROM settings WHERE key = 'site_name'");
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($result && $result['value']) {
            $siteName = $result['value'];
        }
    } catch (Exception $e) {
        // 如果获取失败，使用默认值
    }
} else {
    // 配置文件不存在，显示安装页面
    ?>
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Memos - 需要安装</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
            h1 { color: #333; margin-bottom: 20px; }
            p { color: #666; margin-bottom: 30px; line-height: 1.6; }
            .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; }
            .btn:hover { background: #0056b3; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📝 Memos</h1>
            <p>系统尚未安装，请先进行安装配置。</p>
            <a href="install.php" class="btn">开始安装</a>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// 检查是否已登录
if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

// 检查数据库
if (!defined('DB_PATH') || !file_exists(DB_PATH)) {
    ?>
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Memos - 数据库错误</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .container {
                background: white;
                border-radius: 12px;
                padding: 40px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                max-width: 500px;
                width: 100%;
                text-align: center;
            }
            h1 { color: #dc3545; margin-bottom: 20px; }
            p { color: #666; margin-bottom: 30px; }
            .btn {
                display: inline-block;
                padding: 15px 30px;
                background: #dc3545;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-size: 1.1em;
                font-weight: 600;
                margin: 10px;
                transition: all 0.3s;
            }
            .btn:hover { background: #c82333; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>❌ 数据库错误</h1>
            <p>数据库文件不存在，请重新安装。</p>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// 正常加载主页面（复制自 index.php）
?>
<!DOCTYPE html>
<html lang="zh-CN" dir="ltr" data-theme="paper">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($siteName); ?> - 笔记管理系统</title>
    <link rel="icon" type="image/svg+xml" href="favicon.svg">
    <link rel="apple-touch-icon" sizes="180x180" href="favicon.svg">
    <meta name="theme-color" content="#667eea">
    <link rel="stylesheet" href="assets/css/style.css">
    <!-- Marked.js - Markdown 解析器 -->
    <script src="assets/vendor/marked/marked.min.js"></script>
    <!-- Prism.js - 代码高亮 -->
    <link rel="stylesheet" href="assets/vendor/prism/themes/prism.min.css">
    <script src="assets/vendor/prism/components/prism-core.min.js"></script>
    <script src="assets/vendor/prism/plugins/autoloader/prism-autoloader.min.js"></script>
</head>
<body>
    <!-- 移动端顶部导航栏 -->
    <div class="mobile-header">
        <button class="mobile-menu-btn" onclick="toggleMobileSidebar()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
        </button>
        <div class="mobile-logo">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.141 16.488c-.53 0-.824-.353-.824-1.147 0-.795.49-4.182.68-5.736.35-2.885-1.313-4.976-3.725-4.976-1.912 0-3.37.756-4.514 1.973-.776-1.173-1.648-1.973-3.343-1.973-1.652 0-2.676.605-3.684 1.574C6.189 5.138 5.222 4.63 3.777 4.63 2.578 4.629.967 5.23 0 5.825l1.077 2.44c.734-.409 1.336-.718 1.853-.718.566 0 .902.408.808 1.262-.09.824-1.09 10.268-1.09 10.268H5.9s.638-6.061.863-7.885c.264-2.137 1.299-3.49 2.774-3.49 1.294 0 1.735 1.018 1.642 2.21-.08 1.037-1.025 9.165-1.025 9.165h3.27s.72-6.738.946-8.408c.293-2.17 1.692-2.967 2.57-2.967 1.443 0 1.882 1.18 1.747 2.299-.11.91-.5 4.118-.62 5.782-.147 2.058.824 3.589 2.663 3.589 1.206 0 2.412-.344 3.27-.835l-.703-2.413c-.41.177-.797.364-1.155.364" fill="currentColor"/>
            </svg>
            <span>LightMemos</span>
        </div>
        <div style="width: 40px;"></div>
    </div>
    
    <!-- 移动端遮罩层 -->
    <div class="mobile-overlay" onclick="closeMobileSidebar()"></div>
    
    <div id="app" class="app-container">
        <!-- 侧边栏 -->
        <aside class="sidebar">
            <div class="sidebar-header">
                <div class="logo" onclick="toggleFilterSidebar()" style="cursor: pointer;" title="显示/隐藏日历">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.141 16.488c-.53 0-.824-.353-.824-1.147 0-.795.49-4.182.68-5.736.35-2.885-1.313-4.976-3.725-4.976-1.912 0-3.37.756-4.514 1.973-.776-1.173-1.648-1.973-3.343-1.973-1.652 0-2.676.605-3.684 1.574C6.189 5.138 5.222 4.63 3.777 4.63 2.578 4.629.967 5.23 0 5.825l1.077 2.44c.734-.409 1.336-.718 1.853-.718.566 0 .902.408.808 1.262-.09.824-1.09 10.268-1.09 10.268H5.9s.638-6.061.863-7.885c.264-2.137 1.299-3.49 2.774-3.49 1.294 0 1.735 1.018 1.642 2.21-.08 1.037-1.025 9.165-1.025 9.165h3.27s.72-6.738.946-8.408c.293-2.17 1.692-2.967 2.57-2.967 1.443 0 1.882 1.18 1.747 2.299-.11.91-.5 4.118-.62 5.782-.147 2.058.824 3.589 2.663 3.589 1.206 0 2.412-.344 3.27-.835l-.703-2.413c-.41.177-.797.364-1.155.364" fill="currentColor"/>
                    </svg>
                    <span>Memos</span>
                </div>
            </div>
            
            <nav class="sidebar-nav">
                <a href="#" class="nav-item active" data-view="timeline">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="m16 6 4 14"></path>
                        <path d="M12 6v14"></path>
                        <path d="M8 8v12"></path>
                        <path d="M4 4v16"></path>
                    </svg>
                    <span>时间线</span>
                </a>
                <a href="#" class="nav-item" data-view="attachments">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M13.234 20.252 21 12.3"></path>
                        <path d="m16 6-8.414 8.586a2 2 0 0 0 0 2.828 2 2 0 0 0 2.828 0l8.414-8.586a4 4 0 0 0 0-5.656 4 4 0 0 0-5.656 0l-8.415 8.585a6 6 0 1 0 8.486 8.486"></path>
                    </svg>
                    <span>附件</span>
                </a>
                <a href="#" class="nav-item" data-view="stats">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 3v18h18"></path>
                        <path d="M18 17V9"></path>
                        <path d="M13 17V5"></path>
                        <path d="M8 17v-3"></path>
                    </svg>
                    <span>统计</span>
                </a>
                <a href="#" class="nav-item" data-view="shares">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                    <span>分享管理</span>
                </a>
            </nav>
            
            <div class="sidebar-footer">
                <button class="settings-btn sidebar-action-btn" onclick="showSettings()" title="设置">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                </button>
                <button class="settings-btn sidebar-action-btn" onclick="handleLogout()" title="登出" style="margin-top: 8px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16,17 21,12 16,7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                </button>
            </div>
        </aside>
        
        <!-- 主内容区 -->
        <main class="main-content">
            <!-- 侧边筛选栏 -->
            <div class="filter-sidebar">
                <div class="search-box">
                    <input type="text" id="searchInput" placeholder="搜索笔记...">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" onclick="performSearch()">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.3-4.3"></path>
                    </svg>
                </div>
                
                <div class="filter-section">
                    <h3>日历</h3>
                    <div id="calendar" class="calendar"></div>
                </div>
                
                <!-- 内容筛选器 -->
                <div class="filter-section">
                    <div class="content-filters">
                        <button type="button" class="filter-btn" id="filterPinned" onclick="toggleFilter('pinned')" title="查看置顶笔记">
                            <span class="filter-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="12" y1="17" x2="12" y2="22"></line>
                                    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
                                </svg>
                            </span>
                            <span class="filter-label">Pinned</span>
                            <span class="filter-count" id="pinnedCount">0</span>
                        </button>
                        
                        <button type="button" class="filter-btn" id="filterLinks" onclick="toggleFilter('links')" title="查看包含链接的笔记">
                            <span class="filter-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                </svg>
                            </span>
                            <span class="filter-label">Links</span>
                            <span class="filter-count" id="linksCount">0</span>
                        </button>
                        
                        <button type="button" class="filter-btn" id="filterTodo" onclick="toggleFilter('todo')" title="查看待办事项">
                            <span class="filter-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M13 5h8"></path>
                                    <path d="M13 12h8"></path>
                                    <path d="M13 19h8"></path>
                                    <path d="m3 17 2 2 4-4"></path>
                                    <rect x="3" y="4" width="6" height="6" rx="1"></rect>
                                </svg>
                            </span>
                            <span class="filter-label">To-do</span>
                            <span class="filter-count-split">
                                <span id="todoCompleted">0</span>
                                <span class="count-divider">/</span>
                                <span id="todoTotal">0</span>
                            </span>
                        </button>
                        
                        <button type="button" class="filter-btn" id="filterCode" onclick="toggleFilter('code')" title="查看包含代码的笔记">
                            <span class="filter-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="m18 16 4-4-4-4"></path>
                                    <path d="m6 8-4 4 4 4"></path>
                                    <path d="m14.5 4-5 16"></path>
                                </svg>
                            </span>
                            <span class="filter-label">Code</span>
                            <span class="filter-count" id="codeCount">0</span>
                        </button>
                    </div>
                </div>
                
                <div class="filter-section">
                    <h3>标签</h3>
                    <div id="tagList" class="tag-list"></div>
                </div>
            </div>
            
            <!-- 笔记列表 -->
            <div class="content-area">
                <!-- 新建笔记编辑器 -->
                <div class="memo-editor">
                    <div id="vditorPublish"></div>
                    <div class="editor-toolbar">
                        <div class="toolbar-left">
                            <label class="file-upload-btn" title="上传图片">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                    <polyline points="21 15 16 10 5 21"></polyline>
                                </svg>
                                <input type="file" id="imageUpload" accept="image/*" style="display:none;" onchange="uploadImageToPublish(this)">
                            </label>
                            <label class="file-upload-btn" title="上传附件">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M13.234 20.252 21 12.3"></path>
                                    <path d="m16 6-8.414 8.586a2 2 0 0 0 0 2.828 2 2 0 0 0 2.828 0l8.414-8.586a4 4 0 0 0 0-5.656 4 4 0 0 0-5.656 0l-8.415 8.585a6 6 0 1 0 8.486 8.486"></path>
                                </svg>
                                <input type="file" id="fileUpload" style="display:none;" onchange="uploadFileToPublish(this)">
                            </label>
                            <div class="sort-dropdown-container">
                                <button class="file-upload-btn sort-btn" title="排序" onclick="toggleSortDropdown(event)">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M3 6h18M7 12h10m-7 6h4"></path>
                                    </svg>
                                </button>
                                <div class="sort-dropdown" id="sortDropdown">
                                    <div class="sort-option" onclick="changeSortOrder('created_at', 'DESC')">
                                        <span>创建时间降序</span>
                                        <svg class="sort-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                    <div class="sort-option" onclick="changeSortOrder('created_at', 'ASC')">
                                        <span>创建时间升序</span>
                                        <svg class="sort-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                    <div class="sort-option" onclick="changeSortOrder('updated_at', 'DESC')">
                                        <span>修改时间降序</span>
                                        <svg class="sort-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                    <div class="sort-option" onclick="changeSortOrder('updated_at', 'ASC')">
                                        <span>修改时间升序</span>
                                        <svg class="sort-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="toolbar-right">
                            <div class="tag-input-container">
                                <div class="tag-chips" id="tagChips"></div>
                                <input type="text" id="memoTagsInput" placeholder="添加标签..." class="tag-input-field">
                            </div>
                            <button class="btn-primary" onclick="saveMemo()">发布</button>
                        </div>
                    </div>
                </div>
                
                <!-- 笔记列表 -->
                <div id="memoList" class="memo-list"></div>
            </div>
        </main>
    </div>
    
    
    <!-- 修改密码模态框 -->
    <div id="changePasswordModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>修改密码</h2>
                <button class="modal-close" onclick="hideChangePasswordModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="changePasswordForm">
                    <div class="form-group">
                        <label for="currentPassword">当前密码</label>
                        <input type="password" id="currentPassword" name="currentPassword" required>
                    </div>
                    <div class="form-group">
                        <label for="newPassword">新密码</label>
                        <input type="password" id="newPassword" name="newPassword" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label for="confirmPassword">确认新密码</label>
                        <input type="password" id="confirmPassword" name="confirmPassword" required minlength="6">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="hideChangePasswordModal()">取消</button>
                        <button type="submit" class="btn-primary">修改密码</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    
    <!-- 修改用户名模态框 -->
    <div id="changeUsernameModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>修改用户名</h2>
                <button class="modal-close" onclick="hideChangeUsernameModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="changeUsernameForm">
                    <div class="form-group">
                        <label for="newUsername">新用户名</label>
                        <input type="text" id="newUsername" name="newUsername" required>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="hideChangeUsernameModal()">取消</button>
                        <button type="submit" class="btn-primary">保存用户名</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    
    <!-- 网站设置模态框 -->
    <div id="siteSettingsModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>网站设置</h2>
                <button class="modal-close" onclick="hideSiteSettingsModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="siteSettingsForm">
                    <div class="form-group">
                        <label for="siteName">网站名称</label>
                        <input type="text" id="siteName" name="siteName" required>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="hideSiteSettingsModal()">取消</button>
                        <button type="submit" class="btn-primary">保存设置</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    
    <!-- 上传备份模态框 -->
    <div id="uploadBackupModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>上传备份</h2>
                <button class="modal-close" onclick="hideUploadBackupModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="uploadBackupForm" enctype="multipart/form-data">
                    <div class="form-group">
                        <label for="backupFile">选择备份文件</label>
                        <input type="file" id="backupFile" name="backupFile" accept=".db" required>
                        <small style="color: #666; font-size: 12px; margin-top: 5px; display: block;">
                            请选择程序的数据库备份文件(.db格式)
                        </small>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="hideUploadBackupModal()">取消</button>
                        <button type="submit" class="btn-primary">上传并恢复</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    
    <!-- 备份管理模态框 -->
    <div id="backupModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>备份管理</h2>
                <button class="modal-close" onclick="hideBackupModal()">&times;</button>
            </div>
            <div class="backup-content">
                <div class="backup-actions">
                    <button class="btn-primary" onclick="createBackup()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"></path>
                        </svg>
                        创建新备份
                    </button>
                    <button class="btn-secondary" onclick="document.getElementById('backupFileInput').click()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17,8 12,3 7,8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        上传备份
                    </button>
                    <input type="file" id="backupFileInput" accept=".db" style="display: none;" onchange="uploadBackupFile(this)">
                </div>
                
                <div class="backup-list-section">
                    <h3>备份列表</h3>
                    <div id="backupList" class="backup-list">
                        <div class="loading">加载中...</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- 分享模态框 -->
    <div id="shareModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>创建分享</h2>
                <button class="modal-close" onclick="hideShareModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="shareEncrypted">
                        <span>🔒 加密分享</span>
                    </label>
                    <p class="form-hint">勾选后生成随机5位提取码，可自定义</p>
                </div>
                
                <div class="form-group">
                    <label for="sharePasscode">提取码</label>
                    <div class="input-with-button">
                        <input type="text" id="sharePasscode" placeholder="自动生成5位提取码" maxlength="32">
                        <button class="btn-secondary btn-sm" id="sharePasscodeCopyBtn" onclick="copySharePasscode()" disabled>复制</button>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>⏰ 过期时间</label>
                    <div class="radio-group">
                        <label class="radio-label">
                            <input type="radio" name="shareExpire" id="shareExpireNever" checked>
                            <span>永不过期</span>
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="shareExpire" id="shareExpireAt">
                            <span>指定时间</span>
                        </label>
                    </div>
                    <input type="datetime-local" id="shareExpireAtInput" class="datetime-input">
                </div>
                
                <div class="form-group">
                    <label for="shareMaxVisits">📊 访问次数限制</label>
                    <input type="number" id="shareMaxVisits" min="0" step="1" placeholder="留空或0表示不限制">
                </div>
                
                <div class="form-group">
                    <label>🔗 分享链接</label>
                    <div class="input-with-button">
                        <input type="text" id="shareLink" readonly placeholder="点击生成链接按钮">
                        <button class="btn-secondary btn-sm" onclick="copyShareLink()">复制</button>
                    </div>
                </div>
                
                <div class="form-group" id="copyAllGroup" style="display:none;">
                    <button class="btn-primary btn-block" onclick="copyAllShareInfo()">
                        📋 复制全部（链接+提取码+说明）
                    </button>
                </div>
                
                <div class="form-actions">
                    <button class="btn-secondary" onclick="hideShareModal()">关闭</button>
                    <button class="btn-primary" onclick="createShareLink()">生成链接</button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- 编辑分享模态框 -->
    <div id="editShareModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>编辑分享</h2>
                <button class="modal-close" onclick="hideEditShareModal()">&times;</button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="editShareId">
                
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="editShareEncrypted" disabled>
                        <span>🔒 加密分享</span>
                    </label>
                    <p class="form-hint">创建后无法修改加密状态</p>
                </div>
                
                <div class="form-group" id="editPasscodeGroup" style="display:none;">
                    <label for="editSharePasscode">提取码</label>
                    <div class="input-with-button">
                        <input type="text" id="editSharePasscode" placeholder="输入新的提取码（不修改请留空）" maxlength="32">
                        <button class="btn-secondary btn-sm" onclick="generateNewPasscode()">重新生成</button>
                    </div>
                    <p class="form-hint">留空表示不修改提取码</p>
                </div>
                
                <div class="form-group">
                    <label>⏰ 过期时间</label>
                    <div class="radio-group">
                        <label class="radio-label">
                            <input type="radio" name="editShareExpire" id="editShareExpireNever" checked>
                            <span>永不过期</span>
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="editShareExpire" id="editShareExpireAt">
                            <span>指定时间</span>
                        </label>
                    </div>
                    <input type="datetime-local" id="editShareExpireAtInput" class="datetime-input">
                </div>
                
                <div class="form-group">
                    <label for="editShareMaxVisits">📊 访问次数限制</label>
                    <input type="number" id="editShareMaxVisits" min="0" step="1" placeholder="留空或0表示不限制">
                </div>
                
                <div class="form-actions">
                    <button class="btn-secondary" onclick="hideEditShareModal()">取消</button>
                    <button class="btn-primary" onclick="saveShareEdit()">保存</button>
                </div>
            </div>
        </div>
    </div>

    <!-- 灯箱模态框 -->
    <div id="lightbox" class="lightbox">
        <div class="lightbox-content">
            <img id="lightboxImage" class="lightbox-image" src="" alt="">
            <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
            <button class="lightbox-nav lightbox-prev" onclick="previousImage()" id="lightboxPrev">‹</button>
            <button class="lightbox-nav lightbox-next" onclick="nextImage()" id="lightboxNext">›</button>
            <div class="lightbox-counter" id="lightboxCounter"></div>
        </div>
    </div>

    <!-- 右下角悬浮菜单 -->
    <div class="float-menu">
        <button class="float-btn" id="backToTopBtn" title="返回顶部">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
        </button>
        <button class="float-btn" id="pageJumpBtn" title="页面跳转">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                <path d="M9 12h6m-6 4h6"/>
            </svg>
        </button>
    </div>

    <!-- 页面跳转控件 -->
    <div class="page-jumper" id="pageJumper">
        <div class="page-jumper-header">
            <h3>页面跳转</h3>
            <button class="close-btn" id="closeJumperBtn">&times;</button>
        </div>
        <div class="page-jumper-body">
            <div class="page-info">
                <span>第 <span id="currentPageNum">1</span> 页</span>
                <span>共 <span id="totalPages">1</span> 页</span>
            </div>
            <div class="page-slider-container">
                <div class="page-label">1</div>
                <div class="slider-track">
                    <div class="slider-thumb" id="sliderThumb"></div>
                </div>
                <div class="page-label" id="totalPageLabel">1</div>
            </div>
            <div class="page-input-group">
                <input type="number" id="pageInput" min="1" placeholder="输入页码">
                <button class="btn-primary" id="jumpToPageBtn">跳转</button>
            </div>
        </div>
    </div>
    
    <!-- API Tokens 管理模态框 -->
    <div id="apiTokensModal" class="modal">
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h2>API Tokens 管理</h2>
                <button class="modal-close" onclick="hideApiTokensModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div style="margin-bottom: 20px;">
                    <button class="btn-primary" onclick="showCreateApiTokenModal()">创建新 Token</button>
                </div>
                <div id="apiTokensList" style="min-height: 200px;">
                    <div class="loading"><div class="spinner"></div></div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- 创建 API Token 模态框 -->
    <div id="createApiTokenModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>创建 API Token</h2>
                <button class="modal-close" onclick="hideCreateApiTokenModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="createApiTokenForm">
                    <div class="form-group">
                        <label for="tokenName">Token 名称 *</label>
                        <input type="text" id="tokenName" name="tokenName" required placeholder="例如：Mobile App">
                    </div>
                    <div class="form-group">
                        <label for="tokenExpires">过期时间</label>
                        <select id="tokenExpires" name="tokenExpires">
                            <option value="0">永不过期</option>
                            <option value="7">7天</option>
                            <option value="30">30天</option>
                            <option value="90">90天</option>
                            <option value="365">1年</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="hideCreateApiTokenModal()">取消</button>
                        <button type="submit" class="btn-primary">创建</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    
    <!-- 显示 Token 模态框 -->
    <div id="showTokenModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Token 创建成功</h2>
                <button class="modal-close" onclick="hideShowTokenModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
                    <p style="margin: 0; color: #856404; font-size: 14px;">
                        ⚠️ 请立即复制并保存此 Token，关闭后将无法再次查看
                    </p>
                </div>
                <div class="form-group">
                    <label>Token</label>
                    <div class="input-with-button">
                        <input type="text" id="generatedToken" readonly style="font-family: monospace; font-size: 12px;">
                        <button class="btn-secondary btn-sm" onclick="copyGeneratedToken()">复制</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>使用示例（curl）</label>
                    <textarea id="apiUsageExample" readonly rows="8" style="font-family: monospace; font-size: 12px; background: var(--sidebar-bg); resize: vertical;"></textarea>
                </div>
                <div class="form-actions">
                    <button class="btn-primary" onclick="hideShowTokenModal()">我已保存</button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- 帮助弹窗 -->
    <div id="helpModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>程序介绍</h2>
                <button class="modal-close" onclick="hideHelpModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div style="line-height: 1.6; color: var(--text-primary);">
                    <h3 style="margin-bottom: 15px; color: var(--text-primary);">📝 Memos - 轻量级笔记管理系统</h3>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="margin-bottom: 10px; color: var(--text-primary);">✨ 主要功能</h4>
                        <ul style="margin: 0; padding-left: 20px; color: var(--text-secondary);">
                            <li>Markdown 语法支持，代码语法高亮</li>
                            <li>标签管理系统，快速分类整理</li>
                            <li>图片和附件上传，支持多种格式</li>
                            <li>全文搜索，快速找到所需内容</li>
                            <li>笔记置顶，重要内容优先显示</li>
                            <li>统计分析，了解使用情况</li>
                            <li>分享功能，支持加密和过期控制</li>
                            <li>响应式设计，完美适配移动端</li>
                        </ul>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="margin-bottom: 10px; color: var(--text-primary);">🎨 界面特色</h4>
                        <ul style="margin: 0; padding-left: 20px; color: var(--text-secondary);">
                            <li>简洁美观的界面设计</li>
                            <li>支持亮色/暗色/跟随系统主题</li>
                            <li>可折叠侧边栏，节省空间</li>
                            <li>快捷键支持，提高效率</li>
                        </ul>
                    </div>
                    
                    <div style="margin-bottom: 20px; padding: 15px; background: var(--sidebar-bg); border-radius: 8px; border-left: 4px solid var(--primary-color);">
                        <h4 style="margin-bottom: 10px; color: var(--text-primary);">👨‍💻 作者信息</h4>
                        <p style="margin: 0; color: var(--text-secondary);">
                            作者：<strong>Hik</strong><br>
                            GitHub：<a href="https://github.com/hikwin?tab=repositories" target="_blank" style="color: var(--primary-color); text-decoration: none;">@https://github.com/hikwin?tab=repositories</a><br>
                            <span style="color: var(--text-muted); font-size: 14px;">欢迎 Star ⭐</span>
                        </p>
                    </div>
                </div>
                
                <div class="form-actions" style="margin-top: 20px;">
                    <button class="btn-primary" onclick="hideHelpModal()">知道了</button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Vditor 富文本编辑器 -->
    <link rel="stylesheet" href="assets/vendor/vditor/index.css">
    <!-- 移动端底部浮动发布按钮 -->
    <button class="mobile-fab" onclick="showMobilePublishModal()" title="发布笔记">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
    </button>
    
    <!-- 移动端发布弹窗 -->
    <div id="mobilePublishModal" class="mobile-publish-modal">
        <div class="mobile-publish-content">
            <div class="mobile-publish-header">
                <h3>发布笔记</h3>
                <button class="mobile-publish-close" onclick="hideMobilePublishModal()">&times;</button>
            </div>
            <div class="mobile-publish-body">
                <div id="vditorMobile"></div>
                <div class="mobile-publish-toolbar">
                    <div class="mobile-toolbar-left">
                        <label class="file-upload-btn" title="上传图片">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                            <input type="file" id="mobileImageUpload" accept="image/*" style="display:none;" onchange="uploadImageToMobile(this)">
                        </label>
                        <label class="file-upload-btn" title="上传附件">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M13.234 20.252 21 12.3"></path>
                                <path d="m16 6-8.414 8.586a2 2 0 0 0 0 2.828 2 2 0 0 0 2.828 0l8.414-8.586a4 4 0 0 0 0-5.656 4 4 0 0 0-5.656 0l-8.415 8.585a6 6 0 1 0 8.486 8.486"></path>
                            </svg>
                            <input type="file" id="mobileFileUpload" style="display:none;" onchange="uploadFileToMobile(this)">
                        </label>
                    </div>
                    <div class="mobile-toolbar-tags">
                        <div class="tag-chips" id="mobileTagChips"></div>
                        <input type="text" id="mobileTagsInput" placeholder="添加标签..." class="tag-input-field">
                    </div>
                </div>
                <div class="mobile-publish-actions">
                    <button class="btn-secondary" onclick="hideMobilePublishModal()">取消</button>
                    <button class="btn-primary" onclick="saveMemoFromMobile()">发布</button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Vditor JS -->
    <script src="assets/vendor/vditor/index.min.js"></script>
    
    <script src="assets/js/app.js"></script>
</body>
</html>
