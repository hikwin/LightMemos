<?php
// 通用函数库

// 获取数据库连接
function getDB() {
    try {
        $db = new PDO('sqlite:' . DB_PATH);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        
        // 启用外键约束
        $db->exec('PRAGMA foreign_keys = ON');
        
        return $db;
    } catch (PDOException $e) {
        throw new Exception('数据库连接失败: ' . $e->getMessage());
    }
}

// 返回 JSON 响应
function response($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// 获取笔记详情
function getMemoById($db, $id) {
    $stmt = $db->prepare("SELECT * FROM memos WHERE id = ?");
    $stmt->execute([$id]);
    return $stmt->fetch();
}

// 获取笔记标签
function getMemoTags($db, $memoId) {
    $stmt = $db->prepare("
        SELECT t.* FROM tags t
        JOIN memo_tags mt ON t.id = mt.tag_id
        WHERE mt.memo_id = ?
    ");
    $stmt->execute([$memoId]);
    return $stmt->fetchAll();
}

// 获取笔记附件
function getMemoAttachments($db, $memoId) {
    $stmt = $db->prepare("
        SELECT * FROM attachments WHERE memo_id = ?
    ");
    $stmt->execute([$memoId]);
    $attachments = $stmt->fetchAll();
    
    // 添加 URL：图片走直链，其它受控下载
    foreach ($attachments as &$att) {
        if (!empty($att['file_type']) && strpos($att['file_type'], 'image/') === 0) {
            $att['url'] = 'uploads/' . $att['filename'];
        } else {
            $att['url'] = 'api.php?action=download_attachment&id=' . $att['id'] . '&filename=' . rawurlencode($att['original_name']);
        }
    }
    
    return $attachments;
}

// 保存笔记标签
function saveMemoTags($db, $memoId, $tags) {
    if (!is_array($tags)) {
        $tags = array_filter(array_map('trim', explode(' ', $tags)));
    }
    
    foreach ($tags as $tagName) {
        if (empty($tagName)) continue;
        
        // 查找或创建标签
        $stmt = $db->prepare("SELECT id FROM tags WHERE name = ?");
        $stmt->execute([$tagName]);
        $tag = $stmt->fetch();
        
        if (!$tag) {
            $stmt = $db->prepare("INSERT INTO tags (name) VALUES (?)");
            $stmt->execute([$tagName]);
            $tagId = $db->lastInsertId();
        } else {
            $tagId = $tag['id'];
        }
        
        // 关联标签和笔记
        try {
            $stmt = $db->prepare("INSERT INTO memo_tags (memo_id, tag_id) VALUES (?, ?)");
            $stmt->execute([$memoId, $tagId]);
        } catch (PDOException $e) {
            // 忽略重复插入错误
        }
    }
}

// 清理空标签（没有关联任何笔记的标签）
function cleanupEmptyTags($db) {
    $stmt = $db->prepare("
        DELETE FROM tags 
        WHERE id NOT IN (
            SELECT DISTINCT tag_id 
            FROM memo_tags 
            WHERE tag_id IS NOT NULL
        )
    ");
    $stmt->execute();
    return $stmt->rowCount();
}

// 安全的 HTML 转义
function e($string) {
    return htmlspecialchars($string, ENT_QUOTES, 'UTF-8');
}

// 格式化日期时间
function formatDateTime($datetime) {
    $time = strtotime($datetime);
    $now = time();
    $diff = $now - $time;
    
    if ($diff < 60) {
        return '刚刚';
    } elseif ($diff < 3600) {
        return floor($diff / 60) . ' 分钟前';
    } elseif ($diff < 86400) {
        return floor($diff / 3600) . ' 小时前';
    } elseif ($diff < 604800) {
        return floor($diff / 86400) . ' 天前';
    } else {
        return date('Y-m-d H:i', $time);
    }
}

// 格式化文件大小
function formatFileSize($bytes) {
    $units = ['B', 'KB', 'MB', 'GB'];
    $i = 0;
    
    while ($bytes >= 1024 && $i < count($units) - 1) {
        $bytes /= 1024;
        $i++;
    }
    
    return round($bytes, 2) . ' ' . $units[$i];
}

// 生成缩略图（如果是图片）
function createThumbnail($sourcePath, $targetPath, $maxWidth = 300, $maxHeight = 300) {
    $imageInfo = getimagesize($sourcePath);
    if (!$imageInfo) {
        return false;
    }
    
    list($width, $height, $type) = $imageInfo;
    
    // 计算缩略图尺寸
    $ratio = min($maxWidth / $width, $maxHeight / $height);
    $newWidth = $width * $ratio;
    $newHeight = $height * $ratio;
    
    // 创建图像资源
    switch ($type) {
        case IMAGETYPE_JPEG:
            $source = imagecreatefromjpeg($sourcePath);
            break;
        case IMAGETYPE_PNG:
            $source = imagecreatefrompng($sourcePath);
            break;
        case IMAGETYPE_GIF:
            $source = imagecreatefromgif($sourcePath);
            break;
        default:
            return false;
    }
    
    // 创建缩略图
    $thumb = imagecreatetruecolor($newWidth, $newHeight);
    
    // 保持透明度
    if ($type == IMAGETYPE_PNG || $type == IMAGETYPE_GIF) {
        imagealphablending($thumb, false);
        imagesavealpha($thumb, true);
    }
    
    imagecopyresampled($thumb, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
    
    // 保存缩略图
    switch ($type) {
        case IMAGETYPE_JPEG:
            imagejpeg($thumb, $targetPath, 85);
            break;
        case IMAGETYPE_PNG:
            imagepng($thumb, $targetPath, 8);
            break;
        case IMAGETYPE_GIF:
            imagegif($thumb, $targetPath);
            break;
    }
    
    imagedestroy($source);
    imagedestroy($thumb);
    
    return true;
}

