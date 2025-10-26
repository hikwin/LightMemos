<?php
// API 接口
session_start();

// 检查是否需要重定向到主页
if (isset($_GET['action']) && preg_match('/^\/u\/[a-zA-Z0-9_]+$/', $_GET['action'])) {
    // 检测到 /api.php?action=/u/xxxx 格式，重定向到主页
    $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $scriptDir = dirname($_SERVER['SCRIPT_NAME']);
    
    // 构建主页 URL
    $baseUrl = $protocol . '://' . $host . $scriptDir;
    $baseUrl = rtrim($baseUrl, '/');
    
    header("Location: $baseUrl");
    exit;
}

header('Content-Type: application/json; charset=utf-8');

require_once 'config.php';
require_once 'includes/functions.php';

// 检查是否已登录
$action = isset($_GET['action']) ? $_GET['action'] : '';

// 定义允许游客访问的只读API
$guestAllowedActions = [
    'memos',           // 获取文章列表（只读）
    'memo',            // 获取单个文章（只读）
    'tags',            // 获取标签列表（只读）
    'stats',           // 获取统计信息（只读）
    'login',           // 登录
    'logout',          // 登出
    'site_visibility', // 获取网站权限设置（只读）
    'user_preferences' // 获取用户偏好设置（只读）
];

// 定义使用 Token 认证的 API（这些接口不需要 Session 登录，使用 Token 验证）
$tokenAuthActions = [
    'v1/memos',
    '/api/v1/memos',
    'v1/auth/status',
    '/api/v1/auth/status'
];

// 检查是否为游客访问
$isGuest = !isset($_SESSION['user_id']);

// 如果是游客访问且操作不在允许列表中，拒绝访问
// 但是对于使用 Token 认证的 API，跳过此检查（由各自的处理函数内部验证 Token）
if ($isGuest && !in_array($action, $guestAllowedActions) && !in_array($action, $tokenAuthActions)) {
    response(['error' => '未登录', 'code' => 'UNAUTHORIZED'], 401);
}

// 对于游客访问的API，进一步限制HTTP方法
if ($isGuest && in_array($action, $guestAllowedActions)) {
    // 只允许GET请求，拒绝POST、PUT、DELETE等修改操作
    if ($_SERVER['REQUEST_METHOD'] !== 'GET' && !in_array($action, ['login', 'logout'])) {
        response(['error' => '未登录', 'code' => 'UNAUTHORIZED'], 401);
    }
}

// 获取请求方法和操作
$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

// 连接数据库
try {
    $db = getDB();
    
    // 数据库升级：添加网站权限设置
    try {
        $stmt = $db->prepare("SELECT value FROM settings WHERE key = 'site_visibility'");
        $stmt->execute();
        $result = $stmt->fetch();
        if (!$result) {
            $db->prepare("INSERT INTO settings (key, value) VALUES (?, ?)")->execute(['site_visibility', 'private']);
        }
    } catch (Exception $e) {
        // 忽略错误，可能表不存在
    }
    
} catch (Exception $e) {
    response(['error' => '数据库连接失败'], 500);
}

// 路由处理
switch ($action) {
    case 'memos':
        handleMemos($db, $method);
        break;
    
    case 'memo':
        handleMemo($db, $method);
        break;
    
    case 'tags':
        handleTags($db, $method);
        break;
    
    case 'attachments':
        handleAttachments($db, $method);
        break;
    
    case 'upload':
        handleUpload($db, $method);
        break;
    
    case 'stats':
        handleStats($db, $method);
        break;
    
    case 'export':
        handleExport($db, $method);
        break;
    
    case 'create_share':
        handleCreateShare($db, $method);
        break;
    
    case 'shares':
        handleShares($db, $method);
        break;
    
    case 'share':
        handleShare($db, $method);
        break;
    
    case 'batch_delete_shares':
        handleBatchDeleteShares($db, $method);
        break;
    
    case 'backup':
        handleBackup($db, $method);
        break;
    
    case 'backup_list':
        handleBackupList($db, $method);
        break;
    
    case 'restore':
        handleRestore($db, $method);
        break;
    
    case 'delete_backup':
        handleDeleteBackup($db, $method);
        break;
    
    case 'download_backup':
        handleDownloadBackup($db, $method);
        break;
    
    case 'download_attachment':
        handleDownloadAttachment($db, $method);
        break;
    
    case 'cleanup_tags':
        handleCleanupTags($db, $method);
        break;
    
    case 'change_password':
        handleChangePassword($db, $method);
        break;
    
    case 'site_settings':
        handleSiteSettings($db, $method);
        break;
    
    case 'user_preferences':
        handleUserPreferences($db, $method);
        break;
    
    case 'user_info':
        handleUserInfo($db, $method);
        break;
    
    case 'change_username':
        handleChangeUsername($db, $method);
        break;
    
    case 'site_visibility':
        handleSiteVisibility($db, $method);
        break;
    
    case 'memo_visibility':
        handleMemoVisibility($db, $method);
        break;
    
    case 'upload_backup':
        handleUploadBackup($db, $method);
        break;
    
    case 'upload_backup_file':
        handleUploadBackupFile($db, $method);
        break;
    
    case 'logout':
        handleLogout($db, $method);
        break;
    
    case 'api_tokens':
        handleApiTokens($db, $method);
        break;
    
    case 'api_token':
        handleApiToken($db, $method);
        break;
    
    case 'v1/memos':
    case '/api/v1/memos':
        handleV1Memos($db, $method);
        break;
    
    case 'v1/auth/status':
    case '/api/v1/auth/status':
        handleV1AuthStatus($db, $method);
        break;
    
    case 'update_tags':
        handleUpdateTags($db, $method);
        break;
    
    case 'clean_unused_images':
        handleCleanUnusedImages($db, $method);
        break;
    
    default:
        response(['error' => '无效的操作'], 400);
}

// 处理笔记列表
function handleMemos($db, $method) {
    if ($method === 'GET') {
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        $offset = ($page - 1) * $limit;
        $tag = isset($_GET['tag']) ? $_GET['tag'] : '';
        $search = isset($_GET['search']) ? $_GET['search'] : '';
        $date = isset($_GET['date']) ? $_GET['date'] : '';
        $filter = isset($_GET['filter']) ? $_GET['filter'] : '';
        $sortBy = isset($_GET['sort_by']) ? $_GET['sort_by'] : 'created_at';
        $sortOrder = isset($_GET['sort_order']) ? $_GET['sort_order'] : 'DESC';
        
        // 验证排序字段和顺序
        $allowedSortBy = ['created_at', 'updated_at'];
        $allowedSortOrder = ['ASC', 'DESC'];
        
        if (!in_array($sortBy, $allowedSortBy)) {
            $sortBy = 'created_at';
        }
        if (!in_array(strtoupper($sortOrder), $allowedSortOrder)) {
            $sortOrder = 'DESC';
        }
        $sortOrder = strtoupper($sortOrder);
        
        $where = ['archived = 0'];
        $params = [];
        
        // 检查是否为公开模式，如果是游客访问，只显示公开权限的文章
        if (!isset($_SESSION['user_id'])) {
            $where[] = "visibility = 'public'";
        }
        
        if ($tag) {
            $where[] = "id IN (SELECT memo_id FROM memo_tags mt JOIN tags t ON mt.tag_id = t.id WHERE t.name = ?)";
            $params[] = $tag;
        }
        
        if ($search) {
            // 转义特殊字符，避免SQL注入和错误匹配
            $escapedSearch = str_replace(['%', '_'], ['\%', '\_'], $search);
            $where[] = "content LIKE ? ESCAPE '\\'";
            $params[] = "%{$escapedSearch}%";
        }
        
        if ($date) {
            $where[] = "DATE(created_at) = ?";
            $params[] = $date;
        }
        
        // 内容筛选器
        if ($filter) {
            switch ($filter) {
                case 'pinned':
                    $where[] = "pinned = 1";
                    break;
                case 'links':
                    // 匹配Markdown链接格式 [text](url)
                    // 先宽松匹配，后面会在PHP层面精确过滤
                    $where[] = "content LIKE '%](%'";
                    break;
                case 'todo':
                    // 匹配待办事项格式
                    // 使用宽松匹配（包含方括号），然后在PHP层面精确过滤
                    $where[] = "(content LIKE '%[%]%' AND (content LIKE '%- %' OR content LIKE '%* %' OR content LIKE '%+ %'))";
                    break;
                case 'code':
                    // 匹配代码块 ``` 或行内代码 `
                    $where[] = "(content LIKE '%```%' OR content LIKE '%`%')";
                    break;
            }
        }
        
        $whereClause = implode(' AND ', $where);
        
        // 获取总数
        $countStmt = $db->prepare("SELECT COUNT(*) FROM memos WHERE {$whereClause}");
        foreach ($params as $i => $param) {
            $countStmt->bindValue($i + 1, $param);
        }
        $countStmt->execute();
        $total = (int)$countStmt->fetchColumn();
        
        // 构建ORDER BY子句，置顶优先
        $orderBy = "pinned DESC, {$sortBy} {$sortOrder}";
        
        // 获取笔记列表
        $stmt = $db->prepare("
            SELECT * FROM memos 
            WHERE {$whereClause}
            ORDER BY {$orderBy}
            LIMIT ? OFFSET ?
        ");
        
        foreach ($params as $i => $param) {
            $stmt->bindValue($i + 1, $param);
        }
        $stmt->bindValue(count($params) + 1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(count($params) + 2, $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $memos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 如果是links筛选，进一步过滤掉只有图片链接的笔记
        if ($filter === 'links') {
            $originalCount = count($memos);
            $memos = array_filter($memos, function($memo) {
                // 使用正则匹配超链接（不包括图片链接）
                // 匹配 [text](url) 但不匹配 ![alt](url)
                return preg_match('/(?<!!)\[[^\]]*\]\([^)]+\)/', $memo['content']);
            });
            // 重新索引数组
            $memos = array_values($memos);
            // 注意：不要修改 total，因为它代表的是数据库中符合条件的总记录数
            // 过滤只影响当前页的显示结果
        }
        
        // 如果是todo筛选，进一步精确过滤
        if ($filter === 'todo') {
            $originalCount = count($memos);
            $memos = array_filter($memos, function($memo) {
                // 使用正则匹配待办事项
                // 匹配 - [ ] 或 - [x] 或 * [ ] 等格式
                // 使用更宽松的匹配：列表标记 + 空格 + 方括号
                return preg_match('/[-*+]\s+\[[xX ]\]/', $memo['content']);
            });
            // 重新索引数组
            $memos = array_values($memos);
            // 注意：不要修改 total，因为它代表的是数据库中符合条件的总记录数
            // 过滤只影响当前页的显示结果
        }
        
        // 获取每个笔记的标签和附件
        foreach ($memos as &$memo) {
            $memo['tags'] = getMemoTags($db, $memo['id']);
            $memo['attachments'] = getMemoAttachments($db, $memo['id']);
        }
        
        response([
            'data' => $memos,
            'total' => $total,
            'page' => $page,
            'limit' => $limit
        ]);
    }
}

// 处理单个笔记
function handleMemo($db, $method) {
    if ($method === 'POST') {
        // 创建笔记
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data['content'])) {
            response(['error' => '内容不能为空'], 400);
        }
        
        $stmt = $db->prepare("
            INSERT INTO memos (content, visibility, pinned) 
            VALUES (?, ?, ?)
        ");
        
        $visibility = isset($data['visibility']) ? $data['visibility'] : 'private';
        $pinned = isset($data['pinned']) ? (int)$data['pinned'] : 0;
        $stmt->execute([$data['content'], $visibility, $pinned]);
        
        $memoId = $db->lastInsertId();
        
        // 处理标签
        if (!empty($data['tags'])) {
            saveMemoTags($db, $memoId, $data['tags']);
        }
        
        // 获取创建的笔记
        $memo = getMemoById($db, $memoId);
        $memo['tags'] = getMemoTags($db, $memoId);
        $memo['attachments'] = getMemoAttachments($db, $memoId);
        
        response(['data' => $memo], 201);
        
    } elseif ($method === 'PUT') {
        // 更新笔记
        $data = json_decode(file_get_contents('php://input'), true);
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        
        if (!$id) {
            response(['error' => '缺少笔记ID'], 400);
        }
        
        $fields = [];
        $params = [];
        
        if (isset($data['content'])) {
            $fields[] = "content = ?";
            $params[] = $data['content'];
        }
        
        if (isset($data['pinned'])) {
            $fields[] = "pinned = ?";
            $params[] = (int)$data['pinned'];
        }
        
        if (isset($data['archived'])) {
            $fields[] = "archived = ?";
            $params[] = (int)$data['archived'];
        }
        
        if (isset($data['visibility'])) {
            $fields[] = "visibility = ?";
            $params[] = $data['visibility'];
        }
        
        if (!empty($fields)) {
            $fields[] = "updated_at = CURRENT_TIMESTAMP";
            $params[] = $id;
            
            $sql = "UPDATE memos SET " . implode(', ', $fields) . " WHERE id = ?";
            $stmt = $db->prepare($sql);
            $result = $stmt->execute($params);
            
            if (!$result) {
                response(['success' => false, 'error' => '更新失败'], 500);
            }
        } else {
            response(['success' => false, 'error' => '没有要更新的字段'], 400);
        }
        
        // 更新标签
        if (isset($data['tags'])) {
            // 删除旧标签
            $db->prepare("DELETE FROM memo_tags WHERE memo_id = ?")->execute([$id]);
            // 添加新标签
            saveMemoTags($db, $id, $data['tags']);
            // 清理空标签
            cleanupEmptyTags($db);
        }
        
        $memo = getMemoById($db, $id);
        $memo['tags'] = getMemoTags($db, $id);
        $memo['attachments'] = getMemoAttachments($db, $id);
        
        response(['success' => true, 'data' => $memo]);
        
    } elseif ($method === 'DELETE') {
        // 删除笔记
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        
        if (!$id) {
            response(['error' => '缺少笔记ID'], 400);
        }
        
        // 删除附件文件
        $attachments = getMemoAttachments($db, $id);
        foreach ($attachments as $att) {
            $filePath = UPLOAD_DIR . $att['filename'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }
        }
        
        // 删除笔记（级联删除标签和附件记录）
        $stmt = $db->prepare("DELETE FROM memos WHERE id = ?");
        $stmt->execute([$id]);
        
        // 清理空标签
        cleanupEmptyTags($db);
        
        response(['success' => true]);
        
    } elseif ($method === 'GET') {
        // 获取单个笔记
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        
        if (!$id) {
            response(['error' => '缺少笔记ID'], 400);
        }
        
        $memo = getMemoById($db, $id);
        if (!$memo) {
            response(['error' => '笔记不存在'], 404);
        }
        
        $memo['tags'] = getMemoTags($db, $id);
        $memo['attachments'] = getMemoAttachments($db, $id);
        
        response(['data' => $memo]);
    }
}

// 处理标签
function handleTags($db, $method) {
    if ($method === 'GET') {
        $stmt = $db->query("
            SELECT t.*, COUNT(mt.memo_id) as count 
            FROM tags t 
            LEFT JOIN memo_tags mt ON t.id = mt.tag_id 
            GROUP BY t.id 
            ORDER BY count DESC, t.name ASC
        ");
        
        $tags = $stmt->fetchAll(PDO::FETCH_ASSOC);
        response(['data' => $tags]);
    }
}

// 处理附件列表
function handleAttachments($db, $method) {
    if ($method === 'GET') {
        // 检查是否是检查引用的请求
        if (isset($_GET['check_reference']) && isset($_GET['id'])) {
            $attachmentId = (int)$_GET['id'];
            
            // 获取附件信息
            $stmt = $db->prepare("SELECT filename FROM attachments WHERE id = ?");
            $stmt->execute([$attachmentId]);
            $attachment = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$attachment) {
                response(['success' => false, 'error' => '附件不存在'], 404);
            }
            
            // 检查是否有笔记引用了这个附件
            $stmt = $db->prepare("
                SELECT COUNT(*) as count, GROUP_CONCAT(id) as memo_ids
                FROM memos 
                WHERE content LIKE ?
            ");
            $stmt->execute(['%' . $attachment['filename'] . '%']);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $isReferenced = $result['count'] > 0;
            $memoIds = $isReferenced ? explode(',', $result['memo_ids']) : [];
            
            response([
                'success' => true,
                'is_referenced' => $isReferenced,
                'reference_count' => (int)$result['count'],
                'memo_ids' => $memoIds
            ]);
        }
        
        // 正常的获取附件列表
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $offset = ($page - 1) * $limit;
        $search = isset($_GET['search']) ? $_GET['search'] : '';
        
        $where = [];
        $params = [];
        
        if ($search) {
            // 转义特殊字符
            $escapedSearch = str_replace(['%', '_'], ['\%', '\_'], $search);
            $where[] = "a.original_name LIKE ? ESCAPE '\\'";
            $params[] = "%{$escapedSearch}%";
        }
        
        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        
        // 获取总数
        $countStmt = $db->prepare("SELECT COUNT(*) FROM attachments a {$whereClause}");
        foreach ($params as $i => $param) {
            $countStmt->bindValue($i + 1, $param);
        }
        $countStmt->execute();
        $total = (int)$countStmt->fetchColumn();
        
        $stmt = $db->prepare("
            SELECT a.*, m.content as memo_content 
            FROM attachments a 
            LEFT JOIN memos m ON a.memo_id = m.id 
            {$whereClause}
            ORDER BY a.created_at DESC 
            LIMIT ? OFFSET ?
        ");
        
        $allParams = array_merge($params, [$limit, $offset]);
        $stmt->execute($allParams);
        
        $attachments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 添加 URL：图片走直链，其它使用受控下载接口
        foreach ($attachments as &$att) {
            if (!empty($att['file_type']) && strpos($att['file_type'], 'image/') === 0) {
                $att['url'] = 'uploads/' . $att['filename'];
            } else {
                $att['url'] = 'api.php?action=download_attachment&id=' . $att['id'] . '&filename=' . rawurlencode($att['original_name']);
            }
        }
        
        response([
            'data' => $attachments,
            'total' => $total,
            'page' => $page,
            'limit' => $limit
        ]);
    } elseif ($method === 'DELETE') {
        // 删除附件
        $input = json_decode(file_get_contents('php://input'), true);
        $attachmentId = isset($input['id']) ? (int)$input['id'] : 0;
        
        if (!$attachmentId) {
            response(['success' => false, 'error' => '缺少附件ID'], 400);
        }
        
        // 获取附件信息
        $stmt = $db->prepare("SELECT filename FROM attachments WHERE id = ?");
        $stmt->execute([$attachmentId]);
        $attachment = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$attachment) {
            response(['success' => false, 'error' => '附件不存在'], 404);
        }
        
        // 删除数据库记录
        $stmt = $db->prepare("DELETE FROM attachments WHERE id = ?");
        $stmt->execute([$attachmentId]);
        
        // 删除物理文件
        $filePath = UPLOAD_DIR . $attachment['filename'];
        if (file_exists($filePath)) {
            @unlink($filePath);
        }
        
        response(['success' => true, 'message' => '附件删除成功']);
    }
}

// 处理文件上传
function handleUpload($db, $method) {
    if ($method === 'POST') {
        if (!isset($_FILES['file'])) {
            response(['error' => '没有上传文件'], 400);
        }
        
        $file = $_FILES['file'];
        $memoId = isset($_POST['memo_id']) ? (int)$_POST['memo_id'] : null;
        
        if ($file['error'] !== UPLOAD_ERR_OK) {
            response(['error' => '上传失败'], 500);
        }
        
        if ($file['size'] > MAX_UPLOAD_SIZE) {
            response(['error' => '文件太大'], 400);
        }
        
        // 生成唯一文件名
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        
        // 定义危险的可执行文件扩展名
        $dangerousExtensions = [
            'php', 'php3', 'php4', 'php5', 'phtml', 'phar',
            'jsp', 'jspx',
            'asp', 'aspx', 'asa', 'asax', 'ascx', 'ashx', 'asmx', 'cer', 'aSp', 'aSpx',
            'exe', 'com', 'bat', 'cmd', 'vbs', 'vbe', 'js', 'jse', 'wsf', 'wsh', 'msi',
            'sh', 'bash', 'zsh', 'csh', 'ksh',
            'py', 'pyc', 'pyo', 'pyw',
            'rb', 'rbw',
            'pl', 'pm',
            'cgi',
            'dll', 'so', 'dylib',
            'jar', 'war', 'ear',
            'htaccess', 'htpasswd'
        ];
        
        // 检查是否为危险文件类型（不区分大小写）
        $extLower = strtolower($ext);
        $isDangerous = in_array($extLower, $dangerousExtensions);
        
        // 生成文件名，危险文件添加 .1 后缀
        $filename = uniqid() . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
        if ($isDangerous) {
            $filename .= '.1';
        }
        
        $filePath = UPLOAD_DIR . $filename;
        
        if (!move_uploaded_file($file['tmp_name'], $filePath)) {
            response(['error' => '保存文件失败'], 500);
        }
        
        // 保存到数据库
        $stmt = $db->prepare("
            INSERT INTO attachments (memo_id, filename, original_name, file_type, file_size) 
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $memoId,
            $filename,
            $file['name'],
            $file['type'],
            $file['size']
        ]);
        
        $attachmentId = $db->lastInsertId();
        
        // 图片类型返回直链，其他使用受控下载接口
        $url = 'api.php?action=download_attachment&id=' . $attachmentId . '&filename=' . rawurlencode($file['name']);
        if (!empty($file['type']) && strpos($file['type'], 'image/') === 0) {
            $url = 'uploads/' . $filename;
        }
        
        response([
            'data' => [
                'id' => $attachmentId,
                'filename' => $filename,
                'original_name' => $file['name'],
                'url' => $url,
                'type' => $file['type'],
                'size' => $file['size']
            ]
        ], 201);
    }
}

// 处理统计信息
function handleStats($db, $method) {
    if ($method === 'GET') {
        // 检查是否为游客访问
        $isGuest = !isset($_SESSION['user_id']);
        
        // 根据用户类型添加权限过滤条件
        $visibilityCondition = $isGuest ? "AND visibility = 'public'" : "";
        
        // 总笔记数
        $totalMemos = $db->query("SELECT COUNT(*) FROM memos WHERE archived = 0 {$visibilityCondition}")->fetchColumn();
        
        // 总标签数
        $totalTags = $db->query("SELECT COUNT(*) FROM tags")->fetchColumn();
        
        // 总附件数
        $totalAttachments = $db->query("SELECT COUNT(*) FROM attachments")->fetchColumn();
        
        // 本周笔记数
        $weekMemos = $db->query("
            SELECT COUNT(*) FROM memos 
            WHERE archived = 0 
            {$visibilityCondition}
            AND DATE(created_at) >= DATE('now', '-7 days')
        ")->fetchColumn();
        
        // 本月新增笔记数
        $monthMemos = $db->query("
            SELECT COUNT(*) FROM memos 
            WHERE archived = 0 
            {$visibilityCondition}
            AND DATE(created_at) >= DATE('now', 'start of month')
        ")->fetchColumn();
        
        // 本年新增笔记数
        $yearMemos = $db->query("
            SELECT COUNT(*) FROM memos 
            WHERE archived = 0 
            {$visibilityCondition}
            AND DATE(created_at) >= DATE('now', 'start of year')
        ")->fetchColumn();
        
        // 每日笔记数（最近6个月）
        $dailyStats = $db->query("
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM memos 
            WHERE archived = 0 
            {$visibilityCondition}
            AND DATE(created_at) >= DATE('now', '-6 months')
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        ")->fetchAll(PDO::FETCH_ASSOC);
        
        // 标签统计
        $tagStats = $db->query("
            SELECT t.name, COUNT(mt.memo_id) as count 
            FROM tags t 
            LEFT JOIN memo_tags mt ON t.id = mt.tag_id 
            GROUP BY t.id 
            ORDER BY count DESC 
            LIMIT 10
        ")->fetchAll(PDO::FETCH_ASSOC);
        
        // 使用天数（第一篇笔记到现在的天数）
        $firstMemoDate = $db->query("
            SELECT DATE(created_at) as first_date 
            FROM memos 
            WHERE archived = 0 
            {$visibilityCondition}
            ORDER BY created_at ASC 
            LIMIT 1
        ")->fetchColumn();
        
        $usageDays = 0;
        if ($firstMemoDate) {
            $firstDate = new DateTime($firstMemoDate);
            $today = new DateTime();
            $usageDays = (int)$firstDate->diff($today)->days + 1; // +1 包括第一天
        }
        
        // 记录天数（有记录笔记的天数总数，去重）
        $recordDays = (int)$db->query("
            SELECT COUNT(DISTINCT DATE(created_at)) 
            FROM memos 
            WHERE archived = 0
            {$visibilityCondition}
        ")->fetchColumn();
        
        // 连续记录天数（从昨天往前推，连续有记录的天数）
        $consecutiveDays = 0;
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        
        // 获取所有有笔记的日期（降序排列）
        $recordedDates = $db->query("
            SELECT DISTINCT DATE(created_at) as date 
            FROM memos 
            WHERE archived = 0 
            {$visibilityCondition}
            ORDER BY date DESC
        ")->fetchAll(PDO::FETCH_COLUMN);
        
        // 从昨天开始往前查找连续的日期
        if (!empty($recordedDates)) {
            $checkDate = $yesterday;
            foreach ($recordedDates as $recordDate) {
                if ($recordDate === $checkDate) {
                    $consecutiveDays++;
                    // 往前推一天
                    $checkDate = date('Y-m-d', strtotime($checkDate . ' -1 day'));
                } elseif ($recordDate < $checkDate) {
                    // 日期不连续，退出循环
                    break;
                }
            }
        }
        
        response([
            'data' => [
                'total_memos' => (int)$totalMemos,
                'total_tags' => (int)$totalTags,
                'total_attachments' => (int)$totalAttachments,
                'week_memos' => (int)$weekMemos,
                'month_memos' => (int)$monthMemos,
                'year_memos' => (int)$yearMemos,
                'usage_days' => $usageDays,
                'record_days' => $recordDays,
                'consecutive_days' => $consecutiveDays,
                'daily_stats' => $dailyStats,
                'tag_stats' => $tagStats
            ]
        ]);
    }
}

// 处理导出
function handleExport($db, $method) {
    if ($method === 'GET') {
        $format = $_GET['format'] ?? 'json';
        
        try {
            // 获取所有笔记
            $stmt = $db->query("
                SELECT id, content, created_at, updated_at, pinned, archived, visibility 
                FROM memos 
                ORDER BY pinned DESC, created_at DESC
            ");
            $memos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // 为每个笔记添加标签信息
            foreach ($memos as &$memo) {
                $memo['tags'] = getMemoTags($db, $memo['id']);
            }
            
            response([
                'success' => true,
                'data' => $memos,
                'message' => '导出成功'
            ]);
        } catch (Exception $e) {
            response([
                'success' => false,
                'error' => '导出失败: ' . $e->getMessage()
            ], 500);
        }
    }
}


// 创建分享链接
function handleCreateShare($db, $method) {
    if ($method !== 'POST') {
        response(['success' => false, 'error' => '仅支持POST'], 405);
    }
    
    // 确保表存在
    $db->exec("CREATE TABLE IF NOT EXISTS shares (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT UNIQUE NOT NULL,
        memo_id INTEGER NOT NULL,
        encrypted INTEGER NOT NULL DEFAULT 0,
        passcode_hash TEXT,
        expires_at TEXT,
        max_visits INTEGER,
        visit_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE
    )");
    // 兼容旧表，增加字段
    try { $db->exec("ALTER TABLE shares ADD COLUMN max_visits INTEGER"); } catch (Exception $e) {}
    try { $db->exec("ALTER TABLE shares ADD COLUMN visit_count INTEGER NOT NULL DEFAULT 0"); } catch (Exception $e) {}
    
    $input = json_decode(file_get_contents('php://input'), true);
    $memoId = isset($input['memo_id']) ? (int)$input['memo_id'] : 0;
    $encrypted = !empty($input['encrypted']) ? 1 : 0;
    $passcode = isset($input['passcode']) ? trim($input['passcode']) : '';
    $expiresAt = isset($input['expires_at']) && $input['expires_at'] !== '' ? trim($input['expires_at']) : null; // 格式: YYYY-MM-DD HH:MM
    $maxVisits = isset($input['max_visits']) && $input['max_visits'] !== '' ? (int)$input['max_visits'] : null; // 访问次数限制
    
    if (!$memoId) {
        response(['success' => false, 'error' => '缺少memo_id'], 400);
    }
    
    // 验证笔记存在
    $memo = getMemoById($db, $memoId);
    if (!$memo) {
        response(['success' => false, 'error' => '笔记不存在'], 404);
    }
    
    if ($encrypted) {
        if ($passcode === '') {
            response(['success' => false, 'error' => '加密分享需要提供分享码'], 400);
        }
    } else {
        // 非加密忽略传入的passcode
        $passcode = '';
    }
    
    // 生成唯一token（16位字母数字）
    $token = '';
    do {
        $token = generateAlnumToken(16);
        $stmt = $db->prepare("SELECT id FROM shares WHERE token = ?");
        $stmt->execute([$token]);
        $exists = $stmt->fetch();
    } while ($exists);
    
    $passcodeHash = null;
    if ($encrypted && $passcode !== '') {
        // 使用password_hash存储
        $passcodeHash = password_hash($passcode, PASSWORD_DEFAULT);
    }
    
    // 统一expires_at格式（允许null表示永不过期）
    if ($expiresAt !== null) {
        // 简单校验格式：YYYY-MM-DD HH:MM
        if (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $expiresAt)) {
            response(['success' => false, 'error' => '过期时间格式无效，应为YYYY-MM-DD HH:MM'], 400);
        }
    }
    if ($maxVisits !== null) {
        if (!is_int($maxVisits) || $maxVisits <= 0) {
            response(['success' => false, 'error' => '访问次数限制需为正整数'], 400);
        }
    }
    
    // 插入记录
    $stmt = $db->prepare("INSERT INTO shares (token, memo_id, encrypted, passcode_hash, expires_at, max_visits, visit_count) VALUES (?, ?, ?, ?, ?, ?, 0)");
    $stmt->execute([$token, $memoId, $encrypted, $passcodeHash, $expiresAt, $maxVisits]);
    
    response([
        'success' => true,
        'data' => [
            'token' => $token,
            'encrypted' => (bool)$encrypted,
            'expires_at' => $expiresAt
        ]
    ]);
}

// 获取分享列表
function handleShares($db, $method) {
    if ($method === 'GET') {
        try {
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
            $offset = ($page - 1) * $limit;
            $search = isset($_GET['search']) ? trim($_GET['search']) : '';
            $statusFilter = isset($_GET['status']) ? $_GET['status'] : '';
            $encryptedFilter = isset($_GET['encrypted']) ? $_GET['encrypted'] : '';
            
            $where = [];
            $params = [];
        
        // 搜索内容
        if ($search) {
            // 转义特殊字符
            $escapedSearch = str_replace(['%', '_'], ['\%', '\_'], $search);
            $where[] = "m.content LIKE ? ESCAPE '\\'";
            $params[] = "%{$escapedSearch}%";
        }
        
        // 筛选加密状态
        if ($encryptedFilter !== '' && in_array($encryptedFilter, ['0', '1'])) {
            $where[] = "s.encrypted = ?";
            $params[] = (int)$encryptedFilter;
        }
        
        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        
        // 获取总数
        $countSql = "SELECT COUNT(*) FROM shares s LEFT JOIN memos m ON s.memo_id = m.id {$whereClause}";
        $countStmt = $db->prepare($countSql);
        foreach ($params as $i => $param) {
            $countStmt->bindValue($i + 1, $param);
        }
        $countStmt->execute();
        $total = (int)$countStmt->fetchColumn();
        
        // 获取分享列表
        $sql = "
            SELECT s.*, m.content, m.created_at as memo_created_at
            FROM shares s
            LEFT JOIN memos m ON s.memo_id = m.id
            {$whereClause}
            ORDER BY s.created_at DESC
            LIMIT ? OFFSET ?
        ";
        $stmt = $db->prepare($sql);
        foreach ($params as $i => $param) {
            $stmt->bindValue($i + 1, $param);
        }
        $stmt->bindValue(count($params) + 1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(count($params) + 2, $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $shares = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 处理每个分享项
        $now = date('Y-m-d H:i:s');
        $filteredShares = [];
        
        foreach ($shares as &$share) {
            // 截取内容前50字
            if ($share['content']) {
                $content = strip_tags($share['content']);
                $share['content_preview'] = mb_substr($content, 0, 50, 'UTF-8');
                if (mb_strlen($content, 'UTF-8') > 50) {
                    $share['content_preview'] .= '...';
                }
            } else {
                $share['content_preview'] = '(笔记已删除)';
            }
            
            // 判断状态
            $isExpired = false;
            
            // 检查时间过期
            if ($share['expires_at'] && $share['expires_at'] < $now) {
                $isExpired = true;
            }
            
            // 检查访问次数过期
            if ($share['max_visits'] && $share['visit_count'] >= $share['max_visits']) {
                $isExpired = true;
            }
            
            $share['status'] = $isExpired ? 'expired' : 'active';
            $share['status_text'] = $isExpired ? '已过期' : '分享中';
            
            // 确保 encrypted 字段为整数类型
            $share['encrypted'] = (int)$share['encrypted'];
            
            // 根据状态筛选（在查询后筛选，因为状态是动态判断的）
            if ($statusFilter === '') {
                $filteredShares[] = $share;
            } elseif ($statusFilter === 'active' && !$isExpired) {
                $filteredShares[] = $share;
            } elseif ($statusFilter === 'expired' && $isExpired) {
                $filteredShares[] = $share;
            }
        }
        
            response([
                'data' => $filteredShares,
                'total' => count($filteredShares),
                'page' => $page,
                'limit' => $limit
            ]);
        } catch (Exception $e) {
            // 捕获所有异常，返回空数据而不是错误
            response([
                'data' => [],
                'total' => 0,
                'page' => 1,
                'limit' => $limit
            ]);
        }
    }
}

// 管理单个分享
function handleShare($db, $method) {
    if ($method === 'PUT') {
        // 更新分享
        $input = json_decode(file_get_contents('php://input'), true);
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        
        if (!$id) {
            response(['success' => false, 'error' => '缺少分享ID'], 400);
        }
        
        $expiresAt = isset($input['expires_at']) && $input['expires_at'] !== '' ? $input['expires_at'] : null;
        $maxVisits = isset($input['max_visits']) && $input['max_visits'] !== '' ? (int)$input['max_visits'] : null;
        $passcode = isset($input['passcode']) && $input['passcode'] !== '' ? trim($input['passcode']) : null;
        
        // 如果提供了新的提取码，更新passcode_hash
        if ($passcode !== null) {
            $passcodeHash = password_hash($passcode, PASSWORD_DEFAULT);
            $stmt = $db->prepare("UPDATE shares SET expires_at = ?, max_visits = ?, passcode_hash = ? WHERE id = ?");
            $stmt->execute([$expiresAt, $maxVisits, $passcodeHash, $id]);
        } else {
            // 不更新提取码
            $stmt = $db->prepare("UPDATE shares SET expires_at = ?, max_visits = ? WHERE id = ?");
            $stmt->execute([$expiresAt, $maxVisits, $id]);
        }
        
        response(['success' => true, 'message' => '更新成功']);
    }
    
    if ($method === 'DELETE') {
        // 删除分享
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        
        if (!$id) {
            response(['success' => false, 'error' => '缺少分享ID'], 400);
        }
        
        $stmt = $db->prepare("DELETE FROM shares WHERE id = ?");
        $stmt->execute([$id]);
        
        response(['success' => true, 'message' => '删除成功']);
    }
}

// 批量删除分享
function handleBatchDeleteShares($db, $method) {
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $ids = isset($input['ids']) ? $input['ids'] : [];
        
        if (empty($ids) || !is_array($ids)) {
            response(['success' => false, 'error' => '缺少分享ID列表'], 400);
        }
        
        // 转换为整数数组并去重
        $ids = array_unique(array_map('intval', $ids));
        
        if (empty($ids)) {
            response(['success' => false, 'error' => '无效的分享ID'], 400);
        }
        
        try {
            $deletedCount = 0;
            
            // 逐个删除（也可以用IN查询一次性删除，但逐个删除便于计数）
            foreach ($ids as $id) {
                $stmt = $db->prepare("DELETE FROM shares WHERE id = ?");
                $stmt->execute([$id]);
                $deletedCount += $stmt->rowCount();
            }
            
            response([
                'success' => true,
                'message' => "成功删除 {$deletedCount} 个分享",
                'deleted_count' => $deletedCount
            ]);
        } catch (Exception $e) {
            response(['success' => false, 'error' => '批量删除失败: ' . $e->getMessage()], 500);
        }
    }
}

function generateAlnumToken($length = 16) {
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    $max = strlen($chars) - 1;
    $token = '';
    for ($i = 0; $i < $length; $i++) {
        $token .= $chars[random_int(0, $max)];
    }
    return $token;
}


// 处理备份
function handleBackup($db, $method) {
    if ($method === 'GET') {
        try {
            $backupDir = (defined('BACKUP_DIR') ? BACKUP_DIR : __DIR__ . '/data/backups');
            if (!is_dir($backupDir)) {
                mkdir($backupDir, 0755, true);
            }
            
            $timestamp = date('YmdHis');
            // 生成8位大小写字母+数字的随机字符串
            $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            $rand = '';
            for ($i = 0; $i < 8; $i++) {
                $rand .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
            $backupFile = $backupDir . '/backup_' . $timestamp . '_' . $rand . '.db';
            
            // 复制数据库文件
            if (copy(DB_PATH, $backupFile)) {
                response([
                    'success' => true,
                    'message' => '备份创建成功',
                    'file' => str_replace(__DIR__ . '/', '', $backupFile)
                ]);
            } else {
                response(['error' => '备份创建失败'], 500);
            }
        } catch (Exception $e) {
            response(['error' => '备份失败: ' . $e->getMessage()], 500);
        }
    }
}

// 处理备份列表
function handleBackupList($db, $method) {
    if ($method === 'GET') {
        try {
            $backupDir = (defined('BACKUP_DIR') ? BACKUP_DIR : __DIR__ . '/data/backups');
            $backups = [];
            
            if (is_dir($backupDir)) {
                $files = glob($backupDir . '/backup_*.db');
                
                foreach ($files as $file) {
                    $backups[] = [
                        'name' => basename($file),
                        'created_at' => date('Y-m-d H:i:s', filemtime($file)),
                        'size' => formatBytes(filesize($file))
                    ];
                }
                
                // 按创建时间倒序排列
                usort($backups, function($a, $b) {
                    return strtotime($b['created_at']) - strtotime($a['created_at']);
                });
            }
            
            response([
                'success' => true,
                'data' => $backups
            ]);
        } catch (Exception $e) {
            response(['error' => '获取备份列表失败: ' . $e->getMessage()], 500);
        }
    }
}

// 处理恢复备份
function handleRestore($db, $method) {
    if ($method === 'GET') {
        $backupName = $_GET['backup'] ?? '';
        
        if (empty($backupName)) {
            response([
                'success' => false,
                'error' => '未指定备份文件'
            ], 400);
        }
        
        try {
            $backupDir = (defined('BACKUP_DIR') ? BACKUP_DIR : __DIR__ . '/data/backups');
            $backupFile = $backupDir . '/' . $backupName;
            
            if (!file_exists($backupFile)) {
                response([
                    'success' => false,
                    'error' => '备份文件不存在'
                ], 404);
            }
            
            // 关闭当前数据库连接
            $db = null;
            
            // 复制备份文件到当前数据库位置
            if (copy($backupFile, DB_PATH)) {
                response([
                    'success' => true,
                    'message' => '恢复成功'
                ]);
            } else {
                response([
                    'success' => false,
                    'error' => '恢复失败'
                ], 500);
            }
        } catch (Exception $e) {
            response([
                'success' => false,
                'error' => '恢复失败: ' . $e->getMessage()
            ], 500);
        }
    }
}

// 处理删除备份
function handleDeleteBackup($db, $method) {
    if ($method === 'GET') {
        $backupName = $_GET['backup'] ?? '';
        
        if (empty($backupName)) {
            response([
                'success' => false,
                'error' => '未指定备份文件'
            ], 400);
        }
        
        try {
            $backupDir = (defined('BACKUP_DIR') ? BACKUP_DIR : __DIR__ . '/data/backups');
            $backupFile = $backupDir . '/' . $backupName;
            
            if (!file_exists($backupFile)) {
                response([
                    'success' => false,
                    'error' => '备份文件不存在'
                ], 404);
            }
            
            if (unlink($backupFile)) {
                response([
                    'success' => true,
                    'message' => '删除成功'
                ]);
            } else {
                response([
                    'success' => false,
                    'error' => '删除失败'
                ], 500);
            }
        } catch (Exception $e) {
            response([
                'success' => false,
                'error' => '删除失败: ' . $e->getMessage()
            ], 500);
        }
    }
}

// 处理标签清理
function handleCleanupTags($db, $method) {
    if ($method === 'POST') {
        try {
            $deletedCount = cleanupEmptyTags($db);
            response([
                'success' => true,
                'message' => "清理完成，删除了 {$deletedCount} 个空标签",
                'deleted_count' => $deletedCount
            ]);
        } catch (Exception $e) {
            response([
                'success' => false,
                'error' => '清理失败: ' . $e->getMessage()
            ], 500);
        }
    }
}

// 格式化文件大小
function formatBytes($size, $precision = 2) {
    $units = array('B', 'KB', 'MB', 'GB', 'TB');
    
    for ($i = 0; $size > 1024 && $i < count($units) - 1; $i++) {
        $size /= 1024;
    }
    
    return round($size, $precision) . ' ' . $units[$i];
}

// 处理修改密码
function handleChangePassword($db, $method) {
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $currentPassword = $input['currentPassword'] ?? '';
        $newPassword = $input['newPassword'] ?? '';
        
        if (empty($currentPassword) || empty($newPassword)) {
            response([
                'success' => false,
                'error' => '当前密码和新密码不能为空'
            ], 400);
        }
        
        if (strlen($newPassword) < 6) {
            response([
                'success' => false,
                'error' => '新密码长度至少6位'
            ], 400);
        }
        
        try {
            $userId = $_SESSION['user_id'];
            
            // 验证当前密码
            $stmt = $db->prepare("SELECT password_hash FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();
            
            if (!$user || !password_verify($currentPassword, $user['password_hash'])) {
                response([
                    'success' => false,
                    'error' => '当前密码错误'
                ], 400);
            }
            
            // 更新密码
            $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
            $stmt = $db->prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->execute([$newPasswordHash, $userId]);
            
            response([
                'success' => true,
                'message' => '密码修改成功'
            ]);
            
        } catch (Exception $e) {
            response([
                'success' => false,
                'error' => '修改密码失败: ' . $e->getMessage()
            ], 500);
        }
    }
}

// 处理用户偏好设置
function handleUserPreferences($db, $method) {
    // 检查并添加user_id字段（如果不存在）
    try {
        $columns = $db->query("PRAGMA table_info(settings)")->fetchAll(PDO::FETCH_ASSOC);
        $hasUserId = false;
        foreach ($columns as $column) {
            if ($column['name'] === 'user_id') {
                $hasUserId = true;
                break;
            }
        }
        
        if (!$hasUserId) {
            $db->exec("ALTER TABLE settings ADD COLUMN user_id INTEGER DEFAULT NULL");
        }
    } catch (Exception $e) {
        // 忽略错误，可能字段已存在
    }
    
    if ($method === 'GET') {
        try {
            // 检查是否为游客访问
            $isGuest = !isset($_SESSION['user_id']);
            
            if ($isGuest) {
                // 游客访问时，只返回全局设置（user_id IS NULL）
                $stmt = $db->prepare("SELECT key, value FROM settings WHERE key IN ('items_per_page', 'max_memo_height', 'enable_image_compress', 'image_compress_quality', 'enable_smart_exif_detection') AND user_id IS NULL");
                $stmt->execute();
                $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
                
                // 如果数据库中没有全局设置，尝试获取任意设置（兼容旧版本数据库）
                if (empty($settings)) {
                    $stmt = $db->prepare("SELECT key, value FROM settings WHERE key IN ('items_per_page', 'max_memo_height', 'enable_image_compress', 'image_compress_quality', 'enable_smart_exif_detection') LIMIT 5");
                    $stmt->execute();
                    $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
                }
            } else {
                // 登录用户访问时，获取用户的偏好设置（优先用户设置，其次全局设置）
                $userId = $_SESSION['user_id'];
                $stmt = $db->prepare("SELECT key, value FROM settings WHERE key IN ('items_per_page', 'max_memo_height', 'enable_image_compress', 'image_compress_quality', 'enable_smart_exif_detection') AND (user_id = ? OR user_id IS NULL)");
                $stmt->execute([$userId]);
                $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            }
            
            response([
                'success' => true,
                'data' => [
                    'items_per_page' => isset($settings['items_per_page']) ? (int)$settings['items_per_page'] : 20,
                    'max_memo_height' => isset($settings['max_memo_height']) ? (int)$settings['max_memo_height'] : 0,
                    'enable_image_compress' => isset($settings['enable_image_compress']) ? (int)$settings['enable_image_compress'] : 0,
                    'image_compress_quality' => isset($settings['image_compress_quality']) ? (float)$settings['image_compress_quality'] : 0.8,
                    'enable_smart_exif_detection' => isset($settings['enable_smart_exif_detection']) ? (int)$settings['enable_smart_exif_detection'] : 0
                ]
            ]);
            
        } catch (Exception $e) {
            response([
                'success' => false,
                'error' => '获取设置失败: ' . $e->getMessage()
            ], 500);
        }
    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        try {
            $userId = $_SESSION['user_id'];
            
            // 保存每页显示数量
            if (isset($input['items_per_page'])) {
                $itemsPerPage = (int)$input['items_per_page'];
                if ($itemsPerPage < 5 || $itemsPerPage > 100) {
                    response([
                        'success' => false,
                        'error' => '每页显示数量必须在 5 到 100 之间'
                    ], 400);
                    return;
                }
                
                // 删除旧设置
                $stmt = $db->prepare("DELETE FROM settings WHERE key = 'items_per_page' AND user_id = ?");
                $stmt->execute([$userId]);
                
                // 插入新设置
                $stmt = $db->prepare("INSERT INTO settings (key, value, user_id) VALUES ('items_per_page', ?, ?)");
                $stmt->execute([$itemsPerPage, $userId]);
            }
            
            // 保存文章最大显示高度
            if (isset($input['max_memo_height'])) {
                $maxMemoHeight = (int)$input['max_memo_height'];
                if ($maxMemoHeight < 0 || $maxMemoHeight > 5000) {
                    response([
                        'success' => false,
                        'error' => '文章最大显示高度必须在 0 到 5000 之间'
                    ], 400);
                    return;
                }
                
                // 删除旧设置
                $stmt = $db->prepare("DELETE FROM settings WHERE key = 'max_memo_height' AND user_id = ?");
                $stmt->execute([$userId]);
                
                // 插入新设置
                $stmt = $db->prepare("INSERT INTO settings (key, value, user_id) VALUES ('max_memo_height', ?, ?)");
                $stmt->execute([$maxMemoHeight, $userId]);
            }
            
            // 保存图片压缩开关
            if (isset($input['enable_image_compress'])) {
                $enableCompress = $input['enable_image_compress'] ? 1 : 0;
                
                // 删除旧设置
                $stmt = $db->prepare("DELETE FROM settings WHERE key = 'enable_image_compress' AND user_id = ?");
                $stmt->execute([$userId]);
                
                // 插入新设置
                $stmt = $db->prepare("INSERT INTO settings (key, value, user_id) VALUES ('enable_image_compress', ?, ?)");
                $stmt->execute([$enableCompress, $userId]);
            }
            
            // 保存图片压缩质量
            if (isset($input['image_compress_quality'])) {
                $quality = (float)$input['image_compress_quality'];
                if ($quality < 0.5 || $quality > 0.95) {
                    response([
                        'success' => false,
                        'error' => '图片压缩质量必须在 0.5 到 0.95 之间'
                    ], 400);
                    return;
                }
                
                // 删除旧设置
                $stmt = $db->prepare("DELETE FROM settings WHERE key = 'image_compress_quality' AND user_id = ?");
                $stmt->execute([$userId]);
                
                // 插入新设置
                $stmt = $db->prepare("INSERT INTO settings (key, value, user_id) VALUES ('image_compress_quality', ?, ?)");
                $stmt->execute([$quality, $userId]);
            }
            
            // 保存智能EXIF识别开关
            if (isset($input['enable_smart_exif_detection'])) {
                $enableSmartDetection = $input['enable_smart_exif_detection'] ? 1 : 0;
                
                // 删除旧设置
                $stmt = $db->prepare("DELETE FROM settings WHERE key = 'enable_smart_exif_detection' AND user_id = ?");
                $stmt->execute([$userId]);
                
                // 插入新设置
                $stmt = $db->prepare("INSERT INTO settings (key, value, user_id) VALUES ('enable_smart_exif_detection', ?, ?)");
                $stmt->execute([$enableSmartDetection, $userId]);
            }
            
            response([
                'success' => true,
                'message' => '设置保存成功'
            ]);
            
        } catch (Exception $e) {
            response([
                'success' => false,
                'error' => '保存设置失败: ' . $e->getMessage()
            ], 500);
        }
    }
}

// 处理网站设置
function handleSiteSettings($db, $method) {
    if ($method === 'GET') {
        try {
            $stmt = $db->prepare("SELECT value FROM settings WHERE key = 'site_name'");
            $stmt->execute();
            $result = $stmt->fetch();
            
            response([
                'success' => true,
                'data' => [
                    'site_name' => $result['value'] ?? 'Memos'
                ]
            ]);
            
        } catch (Exception $e) {
            response([
                'success' => false,
                'error' => '获取设置失败: ' . $e->getMessage()
            ], 500);
        }
    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $siteName = trim($input['site_name'] ?? '');
        
        if (empty($siteName)) {
            response([
                'success' => false,
                'error' => '网站名称不能为空'
            ], 400);
        }
        
        try {
            $stmt = $db->prepare("UPDATE settings SET value = ? WHERE key = 'site_name'");
            $stmt->execute([$siteName]);
            
            response([
                'success' => true,
                'message' => '设置保存成功'
            ]);
            
        } catch (Exception $e) {
            response([
                'success' => false,
                'error' => '保存设置失败: ' . $e->getMessage()
            ], 500);
        }
    }
}

// 处理用户信息
function handleUserInfo($db, $method) {
    if ($method === 'GET') {
        try {
            $userId = $_SESSION['user_id'];
            $stmt = $db->prepare("SELECT username, email, created_at, last_login FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user) {
                response([
                    'success' => true,
                    'data' => $user
                ]);
            } else {
                response([
                    'success' => false,
                    'error' => '用户不存在'
                ], 404);
            }
        } catch (Exception $e) {
            response([
                'success' => false,
                'error' => '获取用户信息失败: ' . $e->getMessage()
            ], 500);
        }
    }
}

// 处理修改用户名
function handleChangeUsername($db, $method) {
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $newUsername = trim($input['username'] ?? '');
        
        if (empty($newUsername)) {
            response([
                'success' => false,
                'error' => '用户名不能为空'
            ], 400);
        }
        
        if (strlen($newUsername) < 3) {
            response([
                'success' => false,
                'error' => '用户名长度至少3位'
            ], 400);
        }
        
        try {
            $userId = $_SESSION['user_id'];
            
            // 检查用户名是否已存在
            $stmt = $db->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
            $stmt->execute([$newUsername, $userId]);
            if ($stmt->fetch()) {
                response([
                    'success' => false,
                    'error' => '用户名已存在'
                ], 400);
            }
            
            // 更新用户名
            $stmt = $db->prepare("UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->execute([$newUsername, $userId]);
            
            response([
                'success' => true,
                'message' => '用户名修改成功'
            ]);
            
        } catch (Exception $e) {
            response([
                'success' => false,
                'error' => '修改用户名失败: ' . $e->getMessage()
            ], 500);
        }
    }
}

// 处理上传备份
function handleUploadBackup($db, $method) {
    if ($method === 'POST') {
        if (!isset($_FILES['backupFile']) || $_FILES['backupFile']['error'] !== UPLOAD_ERR_OK) {
            response([
                'success' => false,
                'error' => '文件上传失败'
            ], 400);
        }
        
        $file = $_FILES['backupFile'];
        
        // 检查文件类型
        if (!preg_match('/\.db$/i', $file['name'])) {
            response([
                'success' => false,
                'error' => '请上传.db格式的数据库备份文件'
            ], 400);
        }
        
        // 检查文件大小（限制为50MB）
        if ($file['size'] > 50 * 1024 * 1024) {
            response([
                'success' => false,
                'error' => '文件过大，请选择小于50MB的备份文件'
            ], 400);
        }
        
        try {
            // 验证数据库文件
            $backupDbPath = $file['tmp_name'];
            $backupDb = new PDO('sqlite:' . $backupDbPath);
            $backupDb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // 检查必要的表是否存在
            $requiredTables = ['users', 'memos', 'tags', 'memo_tags', 'attachments', 'settings'];
            $tablesQuery = $backupDb->query("SELECT name FROM sqlite_master WHERE type='table'");
            $existingTables = $tablesQuery->fetchAll(PDO::FETCH_COLUMN);
            
            $missingTables = array_diff($requiredTables, $existingTables);
            if (!empty($missingTables)) {
                response([
                    'success' => false,
                    'error' => '无效的数据库文件，缺少必要的表：' . implode(', ', $missingTables)
                ], 400);
            }
            
            // 检查表结构是否正确
            $memosColumns = $backupDb->query("PRAGMA table_info(memos)")->fetchAll(PDO::FETCH_ASSOC);
            $memosColumnNames = array_column($memosColumns, 'name');
            $requiredMemosColumns = ['id', 'content', 'created_at', 'updated_at'];
            $missingColumns = array_diff($requiredMemosColumns, $memosColumnNames);
            if (!empty($missingColumns)) {
                response([
                    'success' => false,
                    'error' => '数据库表结构不正确，memos表缺少字段：' . implode(', ', $missingColumns)
                ], 400);
            }
            
            // 检查是否有数据
            $memoCount = $backupDb->query("SELECT COUNT(*) FROM memos")->fetchColumn();
            if ($memoCount == 0) {
                response([
                    'success' => false,
                    'error' => '备份文件为空，没有可恢复的数据'
                ], 400);
            }
            
            // 生成新的备份文件名
            $timestamp = date('YmdHis');
            // 生成8位大小写字母+数字的随机字符串
            $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            $rand = '';
            for ($i = 0; $i < 8; $i++) {
                $rand .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
            $backupFileName = 'backup_' . $timestamp . '_' . $rand . '.db';
            $backupDir = (defined('BACKUP_DIR') ? BACKUP_DIR : __DIR__ . '/data/backups');
            if (!is_dir($backupDir)) {
                mkdir($backupDir, 0755, true);
            }
            $newBackupPath = $backupDir . '/' . $backupFileName;
            
            // 移动上传的文件到备份目录
            if (!move_uploaded_file($file['tmp_name'], $newBackupPath)) {
                response([
                    'success' => false,
                    'error' => '保存备份文件失败'
                ], 500);
            }
            
            // 关闭备份数据库连接
            $backupDb = null;
            
            // 备份当前数据库
            $currentBackupPath = $backupDir . '/backup_before_restore_' . $timestamp . '.db';
            if (!copy(DB_PATH, $currentBackupPath)) {
                response([
                    'success' => false,
                    'error' => '备份当前数据库失败'
                ], 500);
            }
            
            // 替换当前数据库
            if (!copy($newBackupPath, DB_PATH)) {
                response([
                    'success' => false,
                    'error' => '恢复数据库失败'
                ], 500);
            }
            
            // 验证恢复后的数据库
            $restoredDb = new PDO('sqlite:' . DB_PATH);
            $restoredDb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $restoredMemoCount = $restoredDb->query("SELECT COUNT(*) FROM memos")->fetchColumn();
            
            response([
                'success' => true,
                'message' => "备份恢复成功，恢复了 {$restoredMemoCount} 条笔记"
            ]);
            
        } catch (PDOException $e) {
            response([
                'success' => false,
                'error' => '数据库验证失败：' . $e->getMessage()
            ], 400);
        } catch (Exception $e) {
            response([
                'success' => false,
                'error' => '恢复失败：' . $e->getMessage()
            ], 500);
        }
    }
}

// 处理下载备份
function handleDownloadBackup($db, $method) {
    if ($method === 'GET') {
        $backupName = $_GET['backup'] ?? '';
        
        if (empty($backupName)) {
            http_response_code(400);
            echo '备份名称不能为空';
            exit;
        }
        
        // 验证备份名称格式（防止路径遍历攻击）
        if (!preg_match('/^backup_\d{14}_[A-Za-z0-9]{8}\.db$/', $backupName)) {
            http_response_code(400);
            echo '无效的备份文件名';
            exit;
        }
        
        $backupPath = (defined('BACKUP_DIR') ? BACKUP_DIR : __DIR__ . '/data/backups') . '/' . $backupName;
        
        if (!file_exists($backupPath)) {
            http_response_code(404);
            echo '备份文件不存在';
            exit;
        }
        
        // 设置下载头
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . $backupName . '"');
        header('Content-Length: ' . filesize($backupPath));
        header('Cache-Control: no-cache, must-revalidate');
        header('Expires: 0');
        
        // 输出文件内容
        readfile($backupPath);
        exit;
    }
}

// 安全下载附件
function handleDownloadAttachment($db, $method) {
    if ($method !== 'GET') {
        http_response_code(405);
        echo 'Method Not Allowed';
        exit;
    }
    
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if (!$id) {
        http_response_code(400);
        echo '缺少附件ID';
        exit;
    }
    
    // 查询附件
    $stmt = $db->prepare("SELECT filename, original_name, file_type, file_size FROM attachments WHERE id = ?");
    $stmt->execute([$id]);
    $att = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$att) {
        http_response_code(404);
        echo '附件不存在';
        exit;
    }
    
    $filePath = UPLOAD_DIR . $att['filename'];
    if (!file_exists($filePath)) {
        http_response_code(404);
        echo '文件不存在';
        exit;
    }
    
    // 决定响应类型与处置方式（图片可内联，其他一律下载）
    $safeName = preg_replace('/[\r\n"\\]/', '_', $att['original_name']);
    $mime = $att['file_type'];
    if (!$mime || stripos($mime, '/') === false) {
        // 兜底用finfo检测
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            if ($finfo) {
                $detected = finfo_file($finfo, $filePath);
                finfo_close($finfo);
                if ($detected) $mime = $detected;
            }
        }
        if (!$mime) $mime = 'application/octet-stream';
    }
    $isImage = stripos($mime, 'image/') === 0;
    $inline = $isImage && (isset($_GET['inline']) && $_GET['inline'] == '1');
    $size = filesize($filePath);
    
    // 清空缓冲与压缩，确保二进制不被修改
    if (function_exists('session_write_close')) {
        @session_write_close();
    }
    if (function_exists('ini_set')) {
        @ini_set('zlib.output_compression', 'Off');
    }
    while (ob_get_level() > 0) {
        @ob_end_clean();
    }
    clearstatcache(true, $filePath);
    
    header('Content-Type: ' . $mime);
    $disposition = $inline ? 'inline' : 'attachment';
    // 同时提供 filename 与 RFC5987 filename* 以兼容非ASCII
    $encoded = rawurlencode($att['original_name']);
    header("Content-Disposition: $disposition; filename=\"$safeName\"; filename*=UTF-8''$encoded");
    header('Content-Length: ' . $size);
    header('Accept-Ranges: none');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: private, max-age=0, no-cache');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    set_time_limit(0);
    $fp = fopen($filePath, 'rb');
    if ($fp === false) {
        http_response_code(500);
        echo '无法读取文件';
        exit;
    }
    fpassthru($fp);
    fclose($fp);
    exit;
}

// 处理上传备份文件（仅验证和保存，不恢复）
function handleUploadBackupFile($db, $method) {
    if ($method === 'POST') {
        // 检查是否有文件上传
        if (!isset($_FILES['backupFile'])) {
            response([
                'success' => false,
                'error' => '没有上传文件'
            ], 400);
        }
        
        if ($_FILES['backupFile']['error'] !== UPLOAD_ERR_OK) {
            response([
                'success' => false,
                'error' => '文件上传失败，错误代码：' . $_FILES['backupFile']['error']
            ], 400);
        }
        
        $file = $_FILES['backupFile'];
        
        // 检查文件类型
        if (!preg_match('/\.db$/i', $file['name'])) {
            response([
                'success' => false,
                'error' => '请上传.db格式的数据库备份文件'
            ], 400);
        }
        
        // 检查文件大小（限制为50MB）
        if ($file['size'] > 50 * 1024 * 1024) {
            response([
                'success' => false,
                'error' => '文件过大，请选择小于50MB的备份文件'
            ], 400);
        }
        
        try {
            // 验证数据库文件
            $backupDbPath = $file['tmp_name'];
            $backupDb = new PDO('sqlite:' . $backupDbPath);
            $backupDb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // 检查必要的表是否存在
            $requiredTables = ['users', 'memos', 'tags', 'memo_tags', 'attachments', 'settings'];
            $tablesQuery = $backupDb->query("SELECT name FROM sqlite_master WHERE type='table'");
            $existingTables = $tablesQuery->fetchAll(PDO::FETCH_COLUMN);
            
            $missingTables = array_diff($requiredTables, $existingTables);
            if (!empty($missingTables)) {
                response([
                    'success' => false,
                    'error' => '无效的数据库文件，缺少必要的表：' . implode(', ', $missingTables)
                ], 400);
            }
            
            // 检查表结构是否正确
            $memosColumns = $backupDb->query("PRAGMA table_info(memos)")->fetchAll(PDO::FETCH_ASSOC);
            $memosColumnNames = array_column($memosColumns, 'name');
            $requiredMemosColumns = ['id', 'content', 'created_at', 'updated_at'];
            $missingColumns = array_diff($requiredMemosColumns, $memosColumnNames);
            if (!empty($missingColumns)) {
                response([
                    'success' => false,
                    'error' => '数据库表结构不正确，memos表缺少字段：' . implode(', ', $missingColumns)
                ], 400);
            }
            
            // 检查是否有数据
            $memoCount = $backupDb->query("SELECT COUNT(*) FROM memos")->fetchColumn();
            if ($memoCount == 0) {
                response([
                    'success' => false,
                    'error' => '备份文件为空，没有可恢复的数据'
                ], 400);
            }
            
            // 关闭备份数据库连接
            $backupDb = null;
            
            // 生成新的备份文件名
            $timestamp = date('Y-m-d_H-i-s');
            $backupFileName = 'backup_' . $timestamp . '.db';
            $backupDir = 'backups';
            if (!is_dir($backupDir)) {
                mkdir($backupDir, 0755, true);
            }
            $newBackupPath = $backupDir . '/' . $backupFileName;
            
            // 移动上传的文件到备份目录
            if (!move_uploaded_file($file['tmp_name'], $newBackupPath)) {
                response([
                    'success' => false,
                    'error' => '保存备份文件失败'
                ], 500);
            }
            
            response([
                'success' => true,
                'message' => "备份文件上传成功，包含 {$memoCount} 条笔记"
            ]);
            
        } catch (PDOException $e) {
            response([
                'success' => false,
                'error' => '数据库验证失败：' . $e->getMessage()
            ], 400);
        } catch (Exception $e) {
            response([
                'success' => false,
                'error' => '上传失败：' . $e->getMessage()
            ], 500);
        }
    }
}

// 处理登出
function handleLogout($db, $method) {
    if ($method === 'POST') {
        session_destroy();
        response([
            'success' => true,
            'message' => '已登出'
        ]);
    }
}

// API Token 验证中间件
function validateApiToken($db) {
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : (isset($headers['authorization']) ? $headers['authorization'] : '');
    
    if (empty($authHeader)) {
        response([
            'code' => 16,
            'message' => '未提供认证令牌'
        ], 401);
    }
    
    // 解析 Bearer token
    if (!preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
        response([
            'code' => 16,
            'message' => '无效的认证令牌格式'
        ], 401);
    }
    
    $token = $matches[1];
    
    // 验证 token
    $stmt = $db->prepare("
        SELECT at.*, u.id as user_id, u.username 
        FROM api_tokens at
        JOIN users u ON at.user_id = u.id
        WHERE at.token = ? AND at.is_active = 1
    ");
    $stmt->execute([$token]);
    $tokenData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$tokenData) {
        response([
            'code' => 16,
            'message' => '无效的认证令牌'
        ], 401);
    }
    
    // 检查是否过期
    if ($tokenData['expires_at'] && strtotime($tokenData['expires_at']) < time()) {
        response([
            'code' => 16,
            'message' => '认证令牌已过期'
        ], 401);
    }
    
    // 更新最后使用时间
    $updateStmt = $db->prepare("UPDATE api_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?");
    $updateStmt->execute([$tokenData['id']]);
    
    return $tokenData;
}

// 处理 API Tokens 列表和创建
function handleApiTokens($db, $method) {
    // 确保 api_tokens 表存在
    $db->exec("CREATE TABLE IF NOT EXISTS api_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        expires_at DATETIME,
        last_used_at DATETIME,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");
    
    if ($method === 'GET') {
        // 获取当前用户的所有 tokens
        $userId = $_SESSION['user_id'];
        
        $stmt = $db->prepare("
            SELECT id, name, description, created_at, expires_at, last_used_at, is_active
            FROM api_tokens
            WHERE user_id = ?
            ORDER BY created_at DESC
        ");
        $stmt->execute([$userId]);
        $tokens = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        response([
            'success' => true,
            'data' => $tokens
        ]);
        
    } elseif ($method === 'POST') {
        // 创建新的 API token
        $input = json_decode(file_get_contents('php://input'), true);
        $userId = $_SESSION['user_id'];
        
        $name = isset($input['name']) ? trim($input['name']) : '';
        $description = isset($input['description']) ? trim($input['description']) : '';
        $expiresIn = isset($input['expires_in']) ? (int)$input['expires_in'] : 0; // 天数，0表示永不过期
        
        if (empty($name)) {
            response([
                'success' => false,
                'error' => '令牌名称不能为空'
            ], 400);
        }
        
        // 生成随机 token
        $token = bin2hex(random_bytes(32));
        
        // 计算过期时间
        $expiresAt = null;
        if ($expiresIn > 0) {
            $expiresAt = date('Y-m-d H:i:s', strtotime("+{$expiresIn} days"));
        }
        
        try {
            $stmt = $db->prepare("
                INSERT INTO api_tokens (user_id, token, name, description, expires_at)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([$userId, $token, $name, $description, $expiresAt]);
            
            $tokenId = $db->lastInsertId();
            
            // 返回创建的 token（只在创建时返回完整token）
            $stmt = $db->prepare("
                SELECT id, token, name, description, created_at, expires_at, is_active
                FROM api_tokens
                WHERE id = ?
            ");
            $stmt->execute([$tokenId]);
            $tokenData = $stmt->fetch(PDO::FETCH_ASSOC);
            
            response([
                'success' => true,
                'data' => $tokenData,
                'message' => 'API令牌创建成功'
            ]);
            
        } catch (Exception $e) {
            response([
                'success' => false,
                'error' => '创建失败: ' . $e->getMessage()
            ], 500);
        }
    }
}

// 处理单个 API Token（获取、删除、更新）
function handleApiToken($db, $method) {
    $userId = $_SESSION['user_id'];
    $tokenId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    
    if ($method === 'GET') {
        // 获取单个 token（包含完整token值）
        try {
            $stmt = $db->prepare("
                SELECT id, token, name, description, created_at, expires_at, last_used_at, is_active
                FROM api_tokens
                WHERE id = ? AND user_id = ?
            ");
            $stmt->execute([$tokenId, $userId]);
            $token = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($token) {
                response([
                    'success' => true,
                    'data' => $token
                ]);
            } else {
                response([
                    'success' => false,
                    'error' => '令牌不存在或无权访问'
                ], 404);
            }
        } catch (Exception $e) {
            response([
                'success' => false,
                'error' => '获取失败: ' . $e->getMessage()
            ], 500);
        }
        
    } elseif ($method === 'DELETE') {
        // 删除 token
        try {
            $stmt = $db->prepare("DELETE FROM api_tokens WHERE id = ? AND user_id = ?");
            $stmt->execute([$tokenId, $userId]);
            
            if ($stmt->rowCount() > 0) {
                response([
                    'success' => true,
                    'message' => 'API令牌已删除'
                ]);
            } else {
                response([
                    'success' => false,
                    'error' => '令牌不存在或无权删除'
                ], 404);
            }
        } catch (Exception $e) {
            response([
                'success' => false,
                'error' => '删除失败: ' . $e->getMessage()
            ], 500);
        }
        
    } elseif ($method === 'PATCH' || $method === 'PUT') {
        // 更新 token（如禁用/启用）
        $input = json_decode(file_get_contents('php://input'), true);
        
        $fields = [];
        $params = [];
        
        if (isset($input['is_active'])) {
            $fields[] = "is_active = ?";
            $params[] = $input['is_active'] ? 1 : 0;
        }
        
        if (isset($input['name'])) {
            $fields[] = "name = ?";
            $params[] = trim($input['name']);
        }
        
        if (isset($input['description'])) {
            $fields[] = "description = ?";
            $params[] = trim($input['description']);
        }
        
        if (empty($fields)) {
            response([
                'success' => false,
                'error' => '没有要更新的字段'
            ], 400);
        }
        
        $params[] = $tokenId;
        $params[] = $userId;
        
        try {
            $sql = "UPDATE api_tokens SET " . implode(', ', $fields) . " WHERE id = ? AND user_id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            if ($stmt->rowCount() > 0) {
                response([
                    'success' => true,
                    'message' => 'API令牌已更新'
                ]);
            } else {
                response([
                    'success' => false,
                    'error' => '令牌不存在或无权修改'
                ], 404);
            }
        } catch (Exception $e) {
            response([
                'success' => false,
                'error' => '更新失败: ' . $e->getMessage()
            ], 500);
        }
    }
}

// 处理 V1 API - 创建 Memo
function handleV1Memos($db, $method) {
    // 验证 API token
    $tokenData = validateApiToken($db);
    $userId = $tokenData['user_id'];
    
    if ($method === 'POST') {
        // 获取请求体
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            response([
                'code' => 3,
                'message' => '无效的JSON数据'
            ], 400);
        }
        
        // 支持插件格式：{ data: { content, visibility } }
        $data = isset($input['data']) ? $input['data'] : $input;
        
        $content = isset($data['content']) ? trim($data['content']) : '';
        $visibility = isset($data['visibility']) ? $data['visibility'] : 'PRIVATE';
        $tags = isset($data['tags']) && is_array($data['tags']) ? $data['tags'] : [];
        
        // 如果插件没有发送 tags 字段，尝试从内容中提取标签
        if (empty($tags)) {
            $extractedTags = extractTagsFromContent($content);
            if (!empty($extractedTags)) {
                $tags = $extractedTags;
                // 从内容中移除标签，避免重复显示
                $content = removeTagsFromContent($content);
            }
        }
        
        // 验证必填字段
        if (empty($content)) {
            response([
                'code' => 3,
                'message' => '无效参数：content 不能为空'
            ], 400);
        }
        
        // 转换 visibility
        $visibilityMap = [
            'VISIBILITY_UNSPECIFIED' => 'private',
            'PUBLIC' => 'public',
            'PRIVATE' => 'private'
        ];
        $dbVisibility = isset($visibilityMap[$visibility]) ? $visibilityMap[$visibility] : 'private';
        
        try {
            $db->beginTransaction();
            
            // 插入 memo
            $stmt = $db->prepare("
                INSERT INTO memos (content, visibility, created_at, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ");
            $stmt->execute([$content, $dbVisibility]);
            $memoId = $db->lastInsertId();
            
            // 处理标签
            $tagIds = [];
            foreach ($tags as $tagName) {
                $tagName = trim($tagName);
                if (empty($tagName)) continue;
                
                // 检查标签是否存在
                $stmt = $db->prepare("SELECT id FROM tags WHERE name = ?");
                $stmt->execute([$tagName]);
                $tag = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($tag) {
                    $tagId = $tag['id'];
                } else {
                    // 创建新标签
                    $stmt = $db->prepare("INSERT INTO tags (name) VALUES (?)");
                    $stmt->execute([$tagName]);
                    $tagId = $db->lastInsertId();
                }
                
                // 关联标签
                $stmt = $db->prepare("INSERT INTO memo_tags (memo_id, tag_id) VALUES (?, ?)");
                $stmt->execute([$memoId, $tagId]);
                
                $tagIds[] = $tagId;
            }
            
            $db->commit();
            
            // 获取创建的 memo
            $stmt = $db->prepare("
                SELECT id, content, visibility, created_at, updated_at, pinned, archived
                FROM memos
                WHERE id = ?
            ");
            $stmt->execute([$memoId]);
            $memo = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // 获取标签
            $stmt = $db->prepare("
                SELECT t.id, t.name
                FROM tags t
                JOIN memo_tags mt ON t.id = mt.tag_id
                WHERE mt.memo_id = ?
            ");
            $stmt->execute([$memoId]);
            $memoTags = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // 获取用户信息用于返回
            $stmt = $db->prepare("SELECT username FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            $creator = $user ? $user['username'] : 'LightMemos User';
            
            // 格式化响应（符合插件期望的格式）
            $response = [
                'id' => (string)$memo['id'],
                'content' => $memo['content'],
                'creator' => $creator
            ];
            
            response($response, 200);
            
        } catch (Exception $e) {
            $db->rollBack();
            response([
                'code' => 13,
                'message' => '内部错误: ' . $e->getMessage()
            ], 500);
        }
        
    } elseif ($method === 'GET') {
        // 获取 memos 列表
        try {
            $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
            $limit = isset($_GET['limit']) ? min(100, max(1, (int)$_GET['limit'])) : 20;
            $offset = ($page - 1) * $limit;
            
            // 获取 memos
            $stmt = $db->prepare("
                SELECT id, content, visibility, created_at, updated_at, pinned, archived
                FROM memos
                WHERE archived = 0
                ORDER BY pinned DESC, created_at DESC
                LIMIT ? OFFSET ?
            ");
            $stmt->execute([$limit, $offset]);
            $memos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $result = [];
            foreach ($memos as $memo) {
                // 获取标签
                $stmt = $db->prepare("
                    SELECT t.name
                    FROM tags t
                    JOIN memo_tags mt ON t.id = mt.tag_id
                    WHERE mt.memo_id = ?
                ");
                $stmt->execute([$memo['id']]);
                $memoTags = $stmt->fetchAll(PDO::FETCH_COLUMN);
                
                $result[] = [
                    'id' => (int)$memo['id'],
                    'row_status' => $memo['archived'] ? 'ARCHIVED' : 'NORMAL',
                    'creator_id' => $userId,
                    'content' => $memo['content'],
                    'visibility' => 'VISIBILITY_UNSPECIFIED',
                    'resource_ids' => [],
                    'tags' => $memoTags,
                    'create_time' => date('c', strtotime($memo['created_at'])),
                    'update_time' => date('c', strtotime($memo['updated_at']))
                ];
            }
            
            response([
                'code' => 0,
                'message' => 'OK',
                'memos' => $result
            ], 200);
            
        } catch (Exception $e) {
            response([
                'code' => 13,
                'message' => '内部错误: ' . $e->getMessage()
            ], 500);
        }
    } else {
        response([
            'code' => 12,
            'message' => '不支持的请求方法'
        ], 405);
    }
}

// 处理 v1/auth/status 接口
function handleV1AuthStatus($db, $method) {
    if ($method !== 'POST') {
        response([
            'code' => 12,
            'message' => '不支持的请求方法'
        ], 405);
    }
    
    // 验证 API token
    $tokenData = validateApiToken($db);
    $userId = $tokenData['user_id'];
    
    try {
        // 获取用户信息（兼容没有新字段的旧数据库）
        $stmt = $db->prepare("SELECT username, email FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            response([
                'code' => 5,
                'message' => '用户不存在'
            ], 404);
        }
        
        // 尝试获取新字段（如果不存在则动态添加）
        $avatarUrl = '';
        $description = '';
        
        try {
            $stmt = $db->prepare("SELECT avatar_url, description FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $extraFields = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($extraFields) {
                $avatarUrl = $extraFields['avatar_url'] ?: '';
                $description = $extraFields['description'] ?: '';
            }
        } catch (Exception $e) {
            // 字段不存在，尝试添加字段
            try {
                $db->exec("ALTER TABLE users ADD COLUMN avatar_url TEXT");
            } catch (Exception $e2) {
                // 字段可能已存在，忽略错误
            }
            try {
                $db->exec("ALTER TABLE users ADD COLUMN description TEXT");
            } catch (Exception $e2) {
                // 字段可能已存在，忽略错误
            }
            
            // 重新尝试查询
            try {
                $stmt = $db->prepare("SELECT avatar_url, description FROM users WHERE id = ?");
                $stmt->execute([$userId]);
                $extraFields = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($extraFields) {
                    $avatarUrl = $extraFields['avatar_url'] ?: '';
                    $description = $extraFields['description'] ?: '';
                }
            } catch (Exception $e3) {
                // 仍然失败，使用默认值
                $avatarUrl = '';
                $description = '';
            }
        }
        
        // 返回用户信息，格式符合插件期望
        response([
            'code' => 0,
            'message' => 'OK',
            'username' => $user['username'] ?: 'LightMemos User',
            'avatarUrl' => $avatarUrl,
            'description' => $description ?: 'LightMemos User',
            'email' => $user['email'] ?: ''
        ], 200);
        
    } catch (Exception $e) {
        response([
            'code' => 13,
            'message' => '内部错误: ' . $e->getMessage()
        ], 500);
    }
}

// 从内容中提取标签（支持插件格式）
function extractTagsFromContent($content) {
    $tags = [];
    
    // 优化：从末尾倒序查找换行符，避免扫描整个内容
    $contentLen = strlen($content);
    if ($contentLen === 0) {
        return $tags;
    }
    
    // 从末尾向前查找第一个换行符
    $lastNewlinePos = strrpos($content, "\n");
    
    if ($lastNewlinePos === false) {
        // 如果没有换行符，整个内容就是一行，不提取标签
        return $tags;
    }
    
    // 获取最后一个换行符之后的内容（最后一行）
    $lastLine = substr($content, $lastNewlinePos + 1);
    
    // 使用 trim 前先检查长度，避免不必要的操作
    if (empty($lastLine)) {
        return $tags;
    }
    
    $lastLine = trim($lastLine);
    
    // 快速检查：如果不是以 # 开头，直接返回
    if ($lastLine[0] !== '#') {
        return $tags;
    }
    
    // 检查最后一行是否只包含标签（格式：#标签1 #标签2）
    // 使用 \p{L} 匹配任何语言的字母（包括中文）
    // \p{N} 匹配任何数字
    if (preg_match('/^(#[\p{L}\p{N}_-]+\s*)+$/u', $lastLine)) {
        // 提取所有标签
        if (preg_match_all('/#([\p{L}\p{N}_-]+)/u', $lastLine, $matches)) {
            foreach ($matches[1] as $tag) {
                $tag = trim($tag);
                if (!empty($tag) && !in_array($tag, $tags)) {
                    $tags[] = $tag;
                }
            }
        }
    }
    
    return $tags;
}

// 从内容中移除标签（避免重复显示）
function removeTagsFromContent($content) {
    // 优化：从末尾倒序查找换行符
    $contentLen = strlen($content);
    if ($contentLen === 0) {
        return $content;
    }
    
    // 从末尾向前查找第一个换行符
    $lastNewlinePos = strrpos($content, "\n");
    
    if ($lastNewlinePos === false) {
        // 如果没有换行符，整个内容就是一行，不移除任何内容
        return $content;
    }
    
    // 获取最后一个换行符之后的内容（最后一行）
    $lastLine = substr($content, $lastNewlinePos + 1);
    
    // 快速检查：如果最后一行为空或不以 # 开头，直接返回
    if (empty($lastLine)) {
        return $content;
    }
    
    $lastLine = trim($lastLine);
    
    // 如果最后一行为空（只有空白）或不以 # 开头，直接返回
    if (empty($lastLine) || $lastLine[0] !== '#') {
        return $content;
    }
    
    // 检查最后一行是否只包含标签（格式：#标签1 #标签2）
    // 使用 \p{L} 匹配任何语言的字母（包括中文）
    // \p{N} 匹配任何数字
    if (preg_match('/^(#[\p{L}\p{N}_-]+\s*)+$/u', $lastLine)) {
        // 移除最后一行（包括前面的换行符）
        $content = substr($content, 0, $lastNewlinePos);
        // 移除末尾多余的空白
        $content = rtrim($content);
    }
    
    return $content;
}

// 处理更新标签
function handleUpdateTags($db, $method) {
    if ($method !== 'POST') {
        response(['error' => '方法不允许'], 405);
    }
    
    try {
        // 获取参数
        $memoId = isset($_POST['id']) ? (int)$_POST['id'] : 0;
        $tagsJson = isset($_POST['tags']) ? $_POST['tags'] : '[]';
        
        if (!$memoId) {
            response(['error' => '笔记ID无效'], 400);
        }
        
        // 解析标签
        $tags = json_decode($tagsJson, true);
        if (!is_array($tags)) {
            $tags = [];
        }
        
        // 验证笔记是否存在
        $stmt = $db->prepare("SELECT id FROM memos WHERE id = ? AND archived = 0");
        $stmt->execute([$memoId]);
        $memo = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$memo) {
            response(['error' => '笔记不存在'], 404);
        }
        
        // 开始事务
        $db->beginTransaction();
        
        try {
            // 删除该笔记的所有现有标签关联
            $stmt = $db->prepare("DELETE FROM memo_tags WHERE memo_id = ?");
            $stmt->execute([$memoId]);
            
            // 添加新标签
            foreach ($tags as $tagName) {
                $tagName = trim($tagName);
                if (empty($tagName)) {
                    continue;
                }
                
                // 查找或创建标签
                $stmt = $db->prepare("SELECT id FROM tags WHERE name = ?");
                $stmt->execute([$tagName]);
                $tag = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$tag) {
                    // 创建新标签
                    $stmt = $db->prepare("INSERT INTO tags (name, created_at) VALUES (?, ?)");
                    $stmt->execute([$tagName, date('Y-m-d H:i:s')]);
                    $tagId = $db->lastInsertId();
                } else {
                    $tagId = $tag['id'];
                }
                
                // 关联标签到笔记
                $stmt = $db->prepare("INSERT INTO memo_tags (memo_id, tag_id) VALUES (?, ?)");
                $stmt->execute([$memoId, $tagId]);
            }
            
            // 更新笔记的修改时间
            $stmt = $db->prepare("UPDATE memos SET updated_at = ? WHERE id = ?");
            $stmt->execute([date('Y-m-d H:i:s'), $memoId]);
            
            // 提交事务
            $db->commit();
            
            response(['success' => true, 'message' => '标签更新成功']);
            
        } catch (Exception $e) {
            // 回滚事务
            $db->rollBack();
            throw $e;
        }
        
    } catch (Exception $e) {
        response(['error' => '更新标签失败: ' . $e->getMessage()], 500);
    }
}

// 清理未引用的图片
function handleCleanUnusedImages($db, $method) {
    if ($method !== 'POST') {
        response(['error' => '方法不允许'], 405);
    }
    
    try {
        // 图片格式列表
        $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'];
        
        // 获取所有图片附件
        $stmt = $db->prepare("SELECT * FROM attachments ORDER BY id");
        $stmt->execute();
        $attachments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $deletedCount = 0;
        $freedSpace = 0;
        $deletedFiles = [];
        
        foreach ($attachments as $attachment) {
            // 检查是否是图片格式
            $ext = strtolower(pathinfo($attachment['filename'], PATHINFO_EXTENSION));
            
            if (!in_array($ext, $imageExtensions)) {
                // 不是图片格式，跳过
                continue;
            }
            
            // 检查是否被任何笔记引用
            $stmt = $db->prepare("SELECT COUNT(*) FROM memos WHERE content LIKE ? AND archived = 0");
            $stmt->execute(['%' . $attachment['filename'] . '%']);
            $refCount = (int)$stmt->fetchColumn();
            
            if ($refCount === 0) {
                // 未被引用，删除附件
                
                // 删除物理文件
                $filePath = $attachment['file_path'];
                if (file_exists($filePath)) {
                    $fileSize = filesize($filePath);
                    if (unlink($filePath)) {
                        $freedSpace += $fileSize;
                    }
                }
                
                // 从数据库删除记录
                $deleteStmt = $db->prepare("DELETE FROM attachments WHERE id = ?");
                $deleteStmt->execute([$attachment['id']]);
                
                $deletedCount++;
                $deletedFiles[] = $attachment['original_name'];
            }
        }
        
        response([
            'success' => true,
            'deleted_count' => $deletedCount,
            'freed_space' => $freedSpace,
            'deleted_files' => $deletedFiles,
            'message' => "成功清理 {$deletedCount} 个未引用的图片"
        ]);
        
    } catch (Exception $e) {
        response(['error' => '清理失败: ' . $e->getMessage()], 500);
    }
}

// 处理网站权限设置
function handleSiteVisibility($db, $method) {
    if ($method === 'GET') {
        try {
            $stmt = $db->prepare("SELECT value FROM settings WHERE key = 'site_visibility'");
            $stmt->execute();
            $result = $stmt->fetch();
            $visibility = $result ? $result['value'] : 'private';
            
            response(['visibility' => $visibility]);
        } catch (Exception $e) {
            response(['error' => '获取网站权限设置失败: ' . $e->getMessage()], 500);
        }
    } elseif ($method === 'POST') {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $visibility = isset($input['visibility']) ? $input['visibility'] : '';
            
            if (!in_array($visibility, ['private', 'public'])) {
                response(['error' => '无效的权限设置'], 400);
            }
            
            $stmt = $db->prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
            $stmt->execute(['site_visibility', $visibility]);
            
            response(['success' => true, 'message' => '网站权限设置已更新']);
        } catch (Exception $e) {
            response(['error' => '更新网站权限设置失败: ' . $e->getMessage()], 500);
        }
    } else {
        response(['error' => '方法不允许'], 405);
    }
}

// 处理文章权限设置
function handleMemoVisibility($db, $method) {
    if ($method === 'POST') {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $memoId = isset($input['id']) ? (int)$input['id'] : 0;
            $visibility = isset($input['visibility']) ? $input['visibility'] : '';
            
            if (!$memoId) {
                response(['error' => '笔记ID无效'], 400);
            }
            
            if (!in_array($visibility, ['private', 'public'])) {
                response(['error' => '无效的权限设置'], 400);
            }
            
            // 验证笔记是否存在
            $stmt = $db->prepare("SELECT id FROM memos WHERE id = ? AND archived = 0");
            $stmt->execute([$memoId]);
            $memo = $stmt->fetch();
            
            if (!$memo) {
                response(['error' => '笔记不存在'], 404);
            }
            
            // 更新权限
            $stmt = $db->prepare("UPDATE memos SET visibility = ? WHERE id = ?");
            $stmt->execute([$visibility, $memoId]);
            
            response(['success' => true, 'message' => '文章权限已更新']);
        } catch (Exception $e) {
            response(['error' => '更新文章权限失败: ' . $e->getMessage()], 500);
        }
    } else {
        response(['error' => '方法不允许'], 405);
    }
}

