<?php
/**
 * 完整时区修复脚本
 * 1. 修复已有数据的时间（UTC转本地时间）
 * 2. 更新表结构的默认值（CURRENT_TIMESTAMP -> datetime('now', 'localtime')）
 * 
 * ⚠️  重要提示：
 * - 此脚本会修改数据库表结构和所有时间数据
 * - 强烈建议执行前先备份数据库！
 * - 此脚本只建议执行一次，重复执行会导致时间再次偏移
 * 
 * 使用方法：
 * php fix_timezone.php [偏移小时数]
 * 
 * 例如：
 * php fix_timezone.php 8    # 加8小时（北京时区 UTC+8）
 * php fix_timezone.php -5   # 减5小时
 */

require_once 'config.php';
require_once 'includes/functions.php';

echo "=================================================\n";
echo "        LightMemos 时区完整修复脚本\n";
echo "=================================================\n\n";

// ==================== 重要警告提示 ====================
echo "⚠️  ⚠️  ⚠️  重要警告 ⚠️  ⚠️  ⚠️\n";
echo "=================================================\n\n";
echo "此脚本将执行以下操作：\n";
echo "  1. 修改所有数据库表的时间字段数据（添加或减少指定小时数）\n";
echo "  2. 重建数据库表结构，更新时间默认值\n";
echo "  3. 影响所有表的创建时间、更新时间等字段\n\n";
echo "⚠️  强烈建议：\n";
echo "  - 执行前请先备份数据库！\n";
echo "  - 此脚本只建议执行一次\n";
echo "  - 重复执行会导致时间再次偏移\n\n";
echo "=================================================\n\n";

// 检查是否已经修复过
try {
    $db = getDB();
    
    $stmt = $db->prepare("SELECT value FROM settings WHERE key = 'timezone_fixed'");
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result && $result['value'] === '1') {
        echo "⚠️  警告：检测到数据库已经修复过！\n\n";
        echo "重复运行此脚本会导致时间再次偏移。\n";
        echo "如果您确定需要重新修复，请先在数据库中删除修复标记：\n";
        echo "  DELETE FROM settings WHERE key = 'timezone_fixed';\n\n";
        
        if (php_sapi_name() === 'cli') {
            echo "按 Enter 键继续（不推荐）或 Ctrl+C 退出...\n";
            readline();
        } else {
            echo "<p style='color: red;'>请先删除修复标记后再执行！</p>";
            exit(1);
        }
    }
} catch (Exception $e) {
    // 忽略错误，继续执行
}

// ==================== 获取时间偏移量 ====================

// 检测当前时区
$utcTime = new DateTime('now', new DateTimeZone('UTC'));
$localTime = new DateTime('now');
$autoOffset = $localTime->getOffset() / 3600; // 自动检测的时区偏移

echo "当前服务器时间信息：\n";
echo "  本地时间: " . $localTime->format('Y-m-d H:i:s') . "\n";
echo "  UTC 时间: " . $utcTime->format('Y-m-d H:i:s') . "\n";
echo "  自动检测偏移: UTC" . ($autoOffset >= 0 ? '+' : '') . $autoOffset . "\n\n";

// 从命令行参数获取偏移小时数
$offset = null;
if (php_sapi_name() === 'cli' && isset($argv[1])) {
    $offset = (float)$argv[1];
    echo "使用命令行参数指定的偏移量: " . ($offset >= 0 ? '+' : '') . $offset . " 小时\n\n";
} else {
    // 交互式输入（命令行模式）
    if (php_sapi_name() === 'cli') {
        echo "请输入时间偏移小时数（可以为正数或负数）：\n";
        echo "  例如：8  表示加8小时（北京时区 UTC+8）\n";
        echo "       -5  表示减5小时\n";
        echo "       " . ($autoOffset >= 0 ? '+' : '') . $autoOffset . "  使用自动检测的值（直接回车）\n";
        echo "\n偏移小时数: ";
        
        $input = trim(readline());
        if ($input === '') {
            $offset = $autoOffset;
            echo "使用自动检测的值: " . ($offset >= 0 ? '+' : '') . $offset . " 小时\n\n";
        } else {
            $offset = (float)$input;
            if (!is_numeric($input)) {
                echo "\n错误：请输入有效的数字！\n";
                exit(1);
            }
            echo "使用手动输入的值: " . ($offset >= 0 ? '+' : '') . $offset . " 小时\n\n";
        }
    } else {
        // Web 模式：通过 GET 参数获取
        $offset = isset($_GET['offset']) ? (float)$_GET['offset'] : $autoOffset;
        
        // 如果没有提供参数，显示表单
        if (!isset($_GET['offset']) || !isset($_GET['confirm'])) {
            ?>
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>时区修复脚本</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        max-width: 800px;
                        margin: 50px auto;
                        padding: 20px;
                        background: #f5f5f5;
                    }
                    .container {
                        background: white;
                        padding: 30px;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .warning {
                        background: #fff3cd;
                        border-left: 4px solid #ffc107;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }
                    .warning h3 {
                        margin-top: 0;
                        color: #856404;
                    }
                    .form-group {
                        margin: 20px 0;
                    }
                    label {
                        display: block;
                        margin-bottom: 8px;
                        font-weight: 600;
                    }
                    input[type="number"] {
                        width: 200px;
                        padding: 10px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        font-size: 16px;
                    }
                    .btn {
                        padding: 12px 24px;
                        background: #dc3545;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 16px;
                        margin-top: 10px;
                    }
                    .btn:hover {
                        background: #c82333;
                    }
                    .info {
                        background: #d1ecf1;
                        padding: 10px;
                        border-radius: 4px;
                        margin: 10px 0;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>⚠️ 时区修复脚本</h1>
                    
                    <div class="warning">
                        <h3>重要警告</h3>
                        <p>此脚本将修改数据库表结构和所有时间数据，请确保：</p>
                        <ul>
                            <li>已备份数据库</li>
                            <li>理解此操作的影响</li>
                            <li>此脚本只建议执行一次</li>
                        </ul>
                    </div>
                    
                    <form method="GET">
                        <div class="form-group">
                            <label for="offset">时间偏移小时数（可以为正数或负数）：</label>
                            <input type="number" id="offset" name="offset" 
                                   value="<?php echo $autoOffset; ?>" 
                                   step="0.5" required>
                            <div class="info">
                                <p>例如：</p>
                                <ul>
                                    <li><strong>8</strong> - 加8小时（北京时区 UTC+8）</li>
                                    <li><strong>-5</strong> - 减5小时</li>
                                    <li><strong><?php echo ($autoOffset >= 0 ? '+' : '') . $autoOffset; ?></strong> - 自动检测的值（当前服务器时区）</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="confirm" required>
                                我已备份数据库，理解此操作的影响
                            </label>
                        </div>
                        
                        <button type="submit" class="btn">开始修复</button>
                    </form>
                </div>
            </body>
            </html>
            <?php
            exit;
        }
    }
}

// 验证偏移量范围
if ($offset < -24 || $offset > 24) {
    echo "错误：偏移小时数必须在 -24 到 24 之间！\n";
    exit(1);
}

// 构建 SQLite 时区偏移字符串
$offsetStr = ($offset >= 0 ? '+' : '') . $offset . ' hours';

echo "=================================================\n";
echo "准备开始修复（偏移量: " . ($offset >= 0 ? '+' : '') . $offset . " 小时）\n";
echo "=================================================\n\n";

if (php_sapi_name() === 'cli') {
    echo "最后确认：按 Enter 键继续，或 Ctrl+C 取消...\n";
    readline();
}

try {
    $db = getDB();
    $db->beginTransaction();
    
    echo "步骤 1/2: 修复已有数据的时间...\n";
    echo "----------------------------------------\n";
    
    // 修复 memos 表数据
    echo "修复 memos 表...\n";
    $stmt = $db->query("SELECT id, created_at, updated_at FROM memos");
    $memos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $memoCount = 0;
    
    foreach ($memos as $memo) {
        $updateStmt = $db->prepare("
            UPDATE memos 
            SET created_at = datetime(created_at, ?),
                updated_at = datetime(updated_at, ?)
            WHERE id = ?
        ");
        $updateStmt->execute([$offsetStr, $offsetStr, $memo['id']]);
        $memoCount++;
    }
    echo "  ✓ 已修复 {$memoCount} 条笔记记录\n";
    
    // 修复 tags 表数据
    echo "修复 tags 表...\n";
    $stmt = $db->query("SELECT id, created_at FROM tags");
    $tags = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $tagCount = 0;
    
    foreach ($tags as $tag) {
        $updateStmt = $db->prepare("
            UPDATE tags 
            SET created_at = datetime(created_at, ?)
            WHERE id = ?
        ");
        $updateStmt->execute([$offsetStr, $tag['id']]);
        $tagCount++;
    }
    echo "  ✓ 已修复 {$tagCount} 条标签记录\n";
    
    // 修复 attachments 表数据
    echo "修复 attachments 表...\n";
    $stmt = $db->query("SELECT id, created_at FROM attachments");
    $attachments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $attachmentCount = 0;
    
    foreach ($attachments as $attachment) {
        $updateStmt = $db->prepare("
            UPDATE attachments 
            SET created_at = datetime(created_at, ?)
            WHERE id = ?
        ");
        $updateStmt->execute([$offsetStr, $attachment['id']]);
        $attachmentCount++;
    }
    echo "  ✓ 已修复 {$attachmentCount} 条附件记录\n";
    
    // 修复 users 表数据
    echo "修复 users 表...\n";
    $stmt = $db->query("SELECT id, created_at, updated_at, last_login FROM users");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $userCount = 0;
    
    foreach ($users as $user) {
        $updateStmt = $db->prepare("
            UPDATE users 
            SET created_at = datetime(created_at, ?),
                updated_at = datetime(updated_at, ?),
                last_login = CASE 
                    WHEN last_login IS NOT NULL 
                    THEN datetime(last_login, ?)
                    ELSE last_login 
                END
            WHERE id = ?
        ");
        $updateStmt->execute([$offsetStr, $offsetStr, $offsetStr, $user['id']]);
        $userCount++;
    }
    echo "  ✓ 已修复 {$userCount} 条用户记录\n";
    
    // 修复 api_tokens 表（如果存在）
    $hasApiTokens = false;
    $tokenCount = 0;
    try {
        echo "修复 api_tokens 表...\n";
        $stmt = $db->query("SELECT id, created_at, last_used_at FROM api_tokens");
        $tokens = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($tokens as $token) {
            $updateStmt = $db->prepare("
                UPDATE api_tokens 
                SET created_at = datetime(created_at, ?),
                    last_used_at = CASE 
                        WHEN last_used_at IS NOT NULL 
                        THEN datetime(last_used_at, ?)
                        ELSE last_used_at 
                    END
                WHERE id = ?
            ");
            $updateStmt->execute([$offsetStr, $offsetStr, $token['id']]);
            $tokenCount++;
        }
        echo "  ✓ 已修复 {$tokenCount} 条 API Token 记录\n";
        $hasApiTokens = true;
    } catch (Exception $e) {
        echo "  ⊘ api_tokens 表不存在或为空，跳过\n";
    }
    
    echo "\n步骤 2/2: 更新表结构默认值...\n";
    echo "----------------------------------------\n";
    
    // 暂时禁用外键约束，避免表重建时的约束冲突
    $db->exec("PRAGMA foreign_keys = OFF");
    echo "已禁用外键约束\n\n";
    
    // 阶段 1：重命名所有旧表
    echo "阶段 1/4: 重命名旧表...\n";
    $db->exec("ALTER TABLE memos RENAME TO memos_old");
    echo "  ✓ memos -> memos_old\n";
    
    $db->exec("ALTER TABLE tags RENAME TO tags_old");
    echo "  ✓ tags -> tags_old\n";
    
    $db->exec("ALTER TABLE memo_tags RENAME TO memo_tags_old");
    echo "  ✓ memo_tags -> memo_tags_old\n";
    
    $db->exec("ALTER TABLE attachments RENAME TO attachments_old");
    echo "  ✓ attachments -> attachments_old\n";
    
    $db->exec("ALTER TABLE users RENAME TO users_old");
    echo "  ✓ users -> users_old\n";
    
    if ($hasApiTokens) {
        $db->exec("ALTER TABLE api_tokens RENAME TO api_tokens_old");
        echo "  ✓ api_tokens -> api_tokens_old\n";
    }
    
    // 阶段 2：创建所有新表
    echo "\n阶段 2/4: 创建新表结构...\n";
    
    $db->exec("
        CREATE TABLE memos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT (datetime('now', 'localtime')),
            updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
            pinned INTEGER DEFAULT 0,
            archived INTEGER DEFAULT 0,
            visibility TEXT DEFAULT 'private'
        )
    ");
    echo "  ✓ memos 表已创建\n";
    
    $db->exec("
        CREATE TABLE tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT (datetime('now', 'localtime'))
        )
    ");
    echo "  ✓ tags 表已创建\n";
    
    $db->exec("
        CREATE TABLE memo_tags (
            memo_id INTEGER,
            tag_id INTEGER,
            FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY (memo_id, tag_id)
        )
    ");
    echo "  ✓ memo_tags 表已创建\n";
    
    $db->exec("
        CREATE TABLE attachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            memo_id INTEGER,
            filename TEXT NOT NULL,
            original_name TEXT NOT NULL,
            file_type TEXT,
            file_size INTEGER,
            created_at DATETIME DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE
        )
    ");
    echo "  ✓ attachments 表已创建\n";
    
    $db->exec("
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            email TEXT,
            avatar_url TEXT,
            description TEXT,
            created_at DATETIME DEFAULT (datetime('now', 'localtime')),
            updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
            last_login DATETIME
        )
    ");
    echo "  ✓ users 表已创建\n";
    
    if ($hasApiTokens) {
        $db->exec("
            CREATE TABLE api_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                expires_at DATETIME,
                last_used_at DATETIME,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT (datetime('now', 'localtime')),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ");
        echo "  ✓ api_tokens 表已创建\n";
    }
    
    // 阶段 3：复制数据
    echo "\n阶段 3/4: 复制数据...\n";
    
    $db->exec("
        INSERT INTO memos (id, content, created_at, updated_at, pinned, archived, visibility)
        SELECT id, content, created_at, updated_at, pinned, archived, visibility
        FROM memos_old
    ");
    echo "  ✓ memos 数据已复制 ({$memoCount} 条)\n";
    
    $db->exec("
        INSERT INTO tags (id, name, created_at)
        SELECT id, name, created_at
        FROM tags_old
    ");
    echo "  ✓ tags 数据已复制 ({$tagCount} 条)\n";
    
    $db->exec("
        INSERT INTO memo_tags (memo_id, tag_id)
        SELECT memo_id, tag_id
        FROM memo_tags_old
    ");
    echo "  ✓ memo_tags 数据已复制\n";
    
    $db->exec("
        INSERT INTO attachments (id, memo_id, filename, original_name, file_type, file_size, created_at)
        SELECT id, memo_id, filename, original_name, file_type, file_size, created_at
        FROM attachments_old
    ");
    echo "  ✓ attachments 数据已复制 ({$attachmentCount} 条)\n";
    
    $db->exec("
        INSERT INTO users (id, username, password_hash, email, avatar_url, description, created_at, updated_at, last_login)
        SELECT id, username, password_hash, email, avatar_url, description, created_at, updated_at, last_login
        FROM users_old
    ");
    echo "  ✓ users 数据已复制 ({$userCount} 条)\n";
    
    if ($hasApiTokens) {
        $db->exec("
            INSERT INTO api_tokens (id, user_id, token, name, description, expires_at, last_used_at, is_active, created_at)
            SELECT id, user_id, token, name, description, expires_at, last_used_at, is_active, created_at
            FROM api_tokens_old
        ");
        echo "  ✓ api_tokens 数据已复制 ({$tokenCount} 条)\n";
    }
    
    // 阶段 4：删除旧表
    echo "\n阶段 4/4: 删除旧表...\n";
    
    $db->exec("DROP TABLE memo_tags_old");
    echo "  ✓ memo_tags_old 已删除\n";
    
    $db->exec("DROP TABLE attachments_old");
    echo "  ✓ attachments_old 已删除\n";
    
    if ($hasApiTokens) {
        $db->exec("DROP TABLE api_tokens_old");
        echo "  ✓ api_tokens_old 已删除\n";
    }
    
    $db->exec("DROP TABLE memos_old");
    echo "  ✓ memos_old 已删除\n";
    
    $db->exec("DROP TABLE tags_old");
    echo "  ✓ tags_old 已删除\n";
    
    $db->exec("DROP TABLE users_old");
    echo "  ✓ users_old 已删除\n";
    
    // 重新启用外键约束
    $db->exec("PRAGMA foreign_keys = ON");
    echo "\n已重新启用外键约束\n";
    
    // 标记已修复
    try {
        $stmt = $db->prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('timezone_fixed', '1')");
        $stmt->execute();
        echo "已设置修复标记（防止重复执行）\n";
    } catch (Exception $e) {
        // 忽略错误
    }
    
    // 提交事务
    $db->commit();
    
    echo "\n=================================================\n";
    echo "✓ 时区修复完成！\n";
    echo "=================================================\n\n";
    echo "修复摘要：\n";
    echo "  时间偏移: " . ($offset >= 0 ? '+' : '') . $offset . " 小时\n";
    echo "  数据修复:\n";
    echo "    - 笔记: {$memoCount} 条\n";
    echo "    - 标签: {$tagCount} 条\n";
    echo "    - 附件: {$attachmentCount} 条\n";
    echo "    - 用户: {$userCount} 条\n";
    if ($hasApiTokens) {
        echo "    - API Tokens: {$tokenCount} 条\n";
    }
    echo "\n  表结构更新:\n";
    echo "    - memos ✓\n";
    echo "    - tags ✓\n";
    echo "    - memo_tags ✓\n";
    echo "    - attachments ✓\n";
    echo "    - users ✓\n";
    if ($hasApiTokens) {
        echo "    - api_tokens ✓\n";
    }
    echo "\n从现在开始，所有新创建的数据都会使用正确的本地时间！\n";
    echo "\n验证修复效果：\n";
    echo "  1. 刷新网站页面\n";
    echo "  2. 查看旧文章 - 时间应该正确显示\n";
    echo "  3. 发布新文章 - 应该显示\"刚刚\"或\"几分钟前\"\n";
    echo "  4. 不应该再出现\"8小时前\"的错误\n";
    echo "\n⚠️  重要：此脚本已设置修复标记，不会再次执行。\n";
    echo "建议：验证修复成功后，可删除此脚本文件 fix_timezone.php\n";
    
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    echo "\n=================================================\n";
    echo "✗ 错误: " . $e->getMessage() . "\n";
    echo "=================================================\n";
    echo "\n所有更改已回滚，数据库未受影响。\n";
    echo "错误详情：\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}

