<?php
// 分享查看页面：公开访问
require_once 'config.php';
require_once 'includes/functions.php';

// 连接数据库
try {
    $db = getDB();
} catch (Exception $e) {
    http_response_code(500);
    echo '数据库连接失败';
    exit;
}

// 确保share表存在
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
// 兼容旧表
try { $db->exec("ALTER TABLE shares ADD COLUMN max_visits INTEGER"); } catch (Exception $e) {}
try { $db->exec("ALTER TABLE shares ADD COLUMN visit_count INTEGER NOT NULL DEFAULT 0"); } catch (Exception $e) {}

$token = $_GET['token'] ?? '';
if (empty($token)) {
    http_response_code(400);
    echo '缺少token';
    exit;
}

// 查询分享记录
$stmt = $db->prepare("SELECT * FROM shares WHERE token = ?");
$stmt->execute([$token]);
$share = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$share) {
    http_response_code(404);
    echo '分享不存在或已被删除';
    exit;
}

// 检查过期
if (!empty($share['expires_at'])) {
    $now = new DateTime('now');
    $exp = DateTime::createFromFormat('Y-m-d H:i', $share['expires_at']);
    if ($exp && $now > $exp) {
        http_response_code(410);
        echo '分享已过期';
        exit;
    }
}

// 需要口令?
$needsPass = (int)$share['encrypted'] === 1;
$passOK = false;

if ($needsPass) {
    // POST 校验
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $inputPass = trim($_POST['passcode'] ?? '');
        if ($inputPass !== '' && password_verify($inputPass, $share['passcode_hash'])) {
            $passOK = true;
        } else {
            $error = '口令不正确';
        }
    }
} else {
    $passOK = true;
}

// 校验访问次数限制
if (!empty($share['max_visits'])) {
    $max = (int)$share['max_visits'];
    $visited = (int)$share['visit_count'];
    if ($visited >= $max) {
        http_response_code(410);
        echo '访问链接已失效（超过最大访问次数）';
        exit;
    }
}

// 如通过校验，取memo
$memo = null;
if ($passOK) {
    $memo = getMemoById($db, (int)$share['memo_id']);
    if (!$memo) {
        http_response_code(404);
        echo '笔记不存在';
        exit;
    }
    $memo['tags'] = getMemoTags($db, (int)$share['memo_id']);
    $memo['attachments'] = getMemoAttachments($db, (int)$share['memo_id']);
    // 通过访问校验与口令后，增加访问计数
    try {
        $db->prepare("UPDATE shares SET visit_count = visit_count + 1 WHERE id = ?")->execute([$share['id']]);
    } catch (Exception $e) {}
}
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>分享查看</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <!-- Prism.js - 代码高亮（保留用于代码块复制功能） -->
    <link rel="stylesheet" href="assets/vendor/prism/themes/prism.min.css">
    <script src="assets/vendor/prism/components/prism-core.min.js"></script>
    <script src="assets/vendor/prism/plugins/autoloader/prism-autoloader.min.js"></script>
    <!-- Vditor 预览渲染支持（数学公式、Graphviz、Mermaid等） -->
    <link rel="stylesheet" href="assets/vendor/vditor/index.css">
    <link rel="stylesheet" href="assets/vendor/vditor/dist/css/content-theme/light.css">
    <link rel="stylesheet" href="assets/vendor/vditor/dist/js/katex/katex.min.css">
    <script src="assets/vendor/vditor/dist/js/i18n/zh_CN.js"></script>
    <script src="assets/vendor/vditor/index.min.js"></script>
</head>
<body style="background:#f8f9fa;">
    <div style="max-width: 800px; margin: 40px auto; background: #fff; border-radius: 12px; box-shadow: var(--shadow); padding: 24px;">
        <h2 style="margin-bottom: 12px;">分享内容</h2>
        <?php if (!$passOK && $needsPass): ?>
            <?php if (!empty($error)): ?>
                <div class="toast error" style="margin-bottom:12px;">口令不正确</div>
            <?php endif; ?>
            <form method="post" style="display:flex; gap:8px; align-items:center;">
                <input type="password" name="passcode" placeholder="请输入分享码" style="flex:1; padding:10px 12px; border:1px solid var(--border-color); border-radius:8px;">
                <button type="submit" class="btn-primary">查看</button>
            </form>
        <?php else: ?>
            <?php if ($memo): ?>
                <div class="memo-card" style="box-shadow:none;">
                    <div class="memo-header">
                        <span class="memo-time"><?php echo e($memo['created_at']); ?></span>
                    </div>
                    <?php if (!empty($memo['tags'])): ?>
                        <div class="memo-tags">
                            <?php foreach ($memo['tags'] as $t): ?>
                                <span class="memo-tag">#<?php echo e($t['name']); ?></span>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>
                    <div class="memo-content" id="memoContentHtml"></div>
                    <?php if (!empty($memo['attachments'])): ?>
                        <div class="memo-attachments">
                            <?php foreach ($memo['attachments'] as $att): ?>
                                <?php if (strpos($att['file_type'], 'image/') === 0): ?>
                                    <img src="<?php echo e($att['url']); ?>" alt="<?php echo e($att['original_name']); ?>" class="attachment-thumbnail">
                                <?php else: ?>
                                    <a href="<?php echo e($att['url']); ?>" class="attachment-item">
                                        <span><?php echo e($att['original_name']); ?></span>
                                    </a>
                                <?php endif; ?>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>
                </div>
                <script>
                (function(){
                    const raw = <?php echo json_encode($memo['content'] ?? '', JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
                    const container = document.getElementById('memoContentHtml');
                    
                    // 优先使用 Vditor 预览渲染（支持数学公式、Graphviz、Mermaid等）
                    if (typeof Vditor !== 'undefined' && typeof Vditor.preview === 'function') {
                        try {
                            container.className = 'memo-content vditor-reset';
                            // 使用 Vditor.preview() 方法（注意是大写V，直接方法）
                            Vditor.preview(container, raw, {
                                cdn: './assets/vendor/vditor',
                                math: {
                                    engine: 'KaTeX',
                                    inlineDigit: true
                                },
                                markdown: {
                                    toc: true,
                                    mark: true,
                                    footnotes: true,
                                    autoSpace: true
                                },
                                speech: {
                                    enable: false
                                },
                                hljs: {
                                    enable: false  // 禁用 highlight.js，使用 Prism.js
                                },
                                mode: 'light',
                                after: () => {
                                    console.log('✅ 分享页面 Vditor 渲染完成');
                                }
                            });
                        } catch (error) {
                            console.error('❌ Vditor预览渲染失败:', error);
                            // 如果渲染失败，显示纯文本
                            container.innerText = raw;
                        }
                    } else {
                        // Vditor 未加载，显示纯文本
                        console.warn('Vditor 未加载');
                        container.innerText = raw;
                    }
                })();
                </script>
            <?php endif; ?>
        <?php endif; ?>
    </div>
</body>
</html>


