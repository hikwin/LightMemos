/**
 * 图片压缩和EXIF处理模块
 * 仅在登录用户需要上传图片时动态加载
 * 
 * 功能：
 * - 图片压缩（支持质量调节）
 * - EXIF敏感信息检测
 * - 智能识别（压缩后更大时，无敏感信息则保留原图）
 * - PNG转JPEG优化
 * - 自动尺寸缩放（最大1920px）
 * 
 * @version 1.0.0
 * @author LightMemos
 */

// ==================== 设置管理 ====================

// 获取图片压缩设置
window.getImageCompressSettings = function() {
    return {
        enabled: window.userPreferences?.enable_image_compress === 1,
        quality: window.userPreferences?.image_compress_quality || 0.8,
        smartDetection: window.userPreferences?.enable_smart_exif_detection === 1
    };
};

// 切换图片压缩开关（自动保存）
window.toggleImageCompress = async function() {
    const checkbox = document.getElementById('enableImageCompress');
    const qualitySection = document.getElementById('compressQualitySection');
    
    if (checkbox && qualitySection) {
        qualitySection.style.display = checkbox.checked ? '' : 'none';
        
        // 自动保存设置
        const enabled = checkbox.checked ? 1 : 0;
        
        try {
            const response = await fetch('api.php?action=user_preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    enable_image_compress: enabled
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                if (window.userPreferences) {
                    window.userPreferences.enable_image_compress = enabled;
                }
                if (typeof showToast === 'function') {
                    showToast(enabled ? '已启用图片压缩' : '已禁用图片压缩（仍会清除敏感EXIF）', 'success');
                }
            } else {
                // 保存失败，恢复复选框状态
                checkbox.checked = !checkbox.checked;
                qualitySection.style.display = checkbox.checked ? '' : 'none';
                if (typeof showToast === 'function') {
                    showToast('保存失败：' + result.error, 'error');
                }
            }
        } catch (error) {
            // 保存失败，恢复复选框状态
            checkbox.checked = !checkbox.checked;
            qualitySection.style.display = checkbox.checked ? '' : 'none';
            console.error('保存设置失败:', error);
            if (typeof showToast === 'function') {
                showToast('保存失败：' + error.message, 'error');
            }
        }
    }
};

// 切换智能EXIF识别（自动保存）
window.toggleSmartExifDetection = async function() {
    const checkbox = document.getElementById('enableSmartExifDetection');
    
    if (checkbox) {
        // 自动保存设置
        const enabled = checkbox.checked ? 1 : 0;
        
        try {
            const response = await fetch('api.php?action=user_preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    enable_smart_exif_detection: enabled
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                if (window.userPreferences) {
                    window.userPreferences.enable_smart_exif_detection = enabled;
                }
                if (typeof showToast === 'function') {
                    showToast(enabled ? '已启用智能EXIF识别' : '已禁用智能EXIF识别', 'success');
                }
            } else {
                // 保存失败，恢复复选框状态
                checkbox.checked = !checkbox.checked;
                if (typeof showToast === 'function') {
                    showToast('保存失败：' + result.error, 'error');
                }
            }
        } catch (error) {
            // 保存失败，恢复复选框状态
            checkbox.checked = !checkbox.checked;
            console.error('保存设置失败:', error);
            if (typeof showToast === 'function') {
                showToast('保存失败：' + error.message, 'error');
            }
        }
    }
};

// 更新压缩质量显示
window.updateQualityDisplay = function(value) {
    const display = document.getElementById('qualityDisplay');
    if (display) {
        display.textContent = Math.round(value * 100) + '%';
    }
};

// 保存图片压缩质量
window.saveImageCompressSettings = async function() {
    const qualityInput = document.getElementById('imageCompressQuality');
    
    if (!qualityInput) {
        if (typeof showToast === 'function') {
            showToast('无法获取设置值', 'error');
        }
        return;
    }
    
    const quality = parseFloat(qualityInput.value);
    
    if (quality < 0.5 || quality > 0.95) {
        if (typeof showToast === 'function') {
            showToast('压缩质量必须在 0.5 到 0.95 之间', 'warning');
        }
        return;
    }
    
    try {
        const response = await fetch('api.php?action=user_preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image_compress_quality: quality
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (window.userPreferences) {
                window.userPreferences.image_compress_quality = quality;
            }
            if (typeof showToast === 'function') {
                showToast('压缩质量已保存！', 'success');
            }
        } else {
            if (typeof showToast === 'function') {
                showToast('保存失败：' + result.error, 'error');
            }
        }
    } catch (error) {
        console.error('保存设置失败:', error);
        if (typeof showToast === 'function') {
            showToast('保存失败：' + error.message, 'error');
        }
    }
};

// ==================== EXIF检测 ====================

/**
 * 简易EXIF检测（检查是否包含敏感信息）
 * 检测范围：GPS位置、拍摄时间、相机型号、作者信息
 * @param {File} file - 要检测的图片文件
 * @returns {Promise<Object>} - { hasSensitiveInfo, hasExif, sensitiveTagsFound, reason }
 */
window.checkExifSensitiveInfo = async function(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const view = new DataView(e.target.result);
                
                // 检查是否是JPEG格式（FF D8 FF）
                if (view.getUint8(0) !== 0xFF || view.getUint8(1) !== 0xD8) {
                    // 不是JPEG，无EXIF
                    resolve({ hasSensitiveInfo: false, reason: 'Not JPEG format' });
                    return;
                }
                
                // 查找EXIF段（APP1, 0xFFE1）
                let offset = 2;
                let hasExif = false;
                let hasSensitiveInfo = false;
                const sensitiveTagsFound = [];
                
                while (offset < view.byteLength) {
                    const marker = view.getUint16(offset);
                    
                    if (marker === 0xFFE1) { // APP1 (EXIF)
                        hasExif = true;
                        const segmentSize = view.getUint16(offset + 2);
                        const segmentData = new Uint8Array(e.target.result, offset + 4, segmentSize - 2);
                        const segmentText = new TextDecoder('utf-8').decode(segmentData);
                        
                        // 检查常见的敏感EXIF标签
                        const sensitivePatterns = [
                            { pattern: /GPS/i, name: 'GPS位置' },
                            { pattern: /DateTime/i, name: '拍摄时间' },
                            { pattern: /Make|Model/i, name: '相机型号' },
                            { pattern: /Artist|Copyright/i, name: '作者信息' }
                        ];
                        
                        for (const { pattern, name } of sensitivePatterns) {
                            if (pattern.test(segmentText)) {
                                hasSensitiveInfo = true;
                                sensitiveTagsFound.push(name);
                            }
                        }
                        
                        break;
                    }
                    
                    if (marker === 0xFFDA) { // SOS (Start of Scan) - 图像数据开始
                        break;
                    }
                    
                    offset += 2 + view.getUint16(offset + 2);
                }
                
                resolve({
                    hasSensitiveInfo,
                    hasExif,
                    sensitiveTagsFound,
                    reason: hasSensitiveInfo ? `包含: ${sensitiveTagsFound.join(', ')}` : 'No sensitive EXIF'
                });
                
            } catch (error) {
                console.error('EXIF检测错误:', error);
                // 检测失败时，保守处理，假设有敏感信息
                resolve({ hasSensitiveInfo: true, reason: 'Detection error' });
            }
        };
        
        reader.onerror = function() {
            // 读取失败，保守处理
            resolve({ hasSensitiveInfo: true, reason: 'Read error' });
        };
        
        // 只读取前64KB用于EXIF检测（EXIF通常在文件开头）
        const blob = file.slice(0, 65536);
        reader.readAsArrayBuffer(blob);
    });
};

// ==================== 图片压缩核心 ====================

/**
 * 压缩图片（优化版 + EXIF清除 + 智能检测）
 * @param {File} file - 原始图片文件
 * @param {number} quality - 压缩质量 (0.5-0.95)
 * @param {boolean} smartDetection - 是否启用智能EXIF检测
 * @returns {Promise<File>} - 处理后的图片文件
 */
window.compressImage = async function(file, quality = 0.8, smartDetection = false) {
    // 只处理图片类型
    if (!file.type.startsWith('image/')) {
        console.log(`[压缩跳过] 非图片文件: ${file.name}`);
        return file;
    }
    
    // GIF 图片不压缩（可能是动图）
    if (file.type === 'image/gif') {
        console.log(`[压缩跳过] GIF动图: ${file.name}`);
        return file;
    }
    
    // SVG 图片不压缩（矢量图）
    if (file.type === 'image/svg+xml') {
        console.log(`[压缩跳过] SVG矢量图: ${file.name}`);
        return file;
    }
    
    const originalSize = file.size;
    const originalType = file.type;
    
    // 智能检测：先检查EXIF
    let exifInfo = null;
    if (smartDetection) {
        exifInfo = await window.checkExifSensitiveInfo(file);
        console.log(`🔍 [EXIF检测] ${file.name}: ${exifInfo.reason}`);
    }
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const img = new Image();
            
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // 如果图片太大，按比例缩小
                    const MAX_WIDTH = 1920;
                    const MAX_HEIGHT = 1920;
                    
                    let needResize = false;
                    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
                        width = Math.floor(width * ratio);
                        height = Math.floor(height * ratio);
                        needResize = true;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    
                    // 如果是PNG且要转换为JPEG，先填充白色背景（避免透明区域变黑）
                    const isPNG = originalType === 'image/png';
                    let targetType = originalType;
                    
                    // PNG转JPEG策略：只有当质量<0.95时才转换（保留高质量PNG）
                    if (isPNG && quality < 0.95) {
                        targetType = 'image/jpeg';
                        // 填充白色背景
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, width, height);
                    }
                    
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // 转换为 Blob（此过程会自动清除所有EXIF信息）
                    canvas.toBlob(function(blob) {
                        if (blob) {
                            const compressedSize = blob.size;
                            const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
                            
                            // 创建新的 File 对象
                            let newFileName = file.name;
                            // 如果转换了格式，更新文件扩展名
                            if (targetType !== originalType) {
                                newFileName = file.name.replace(/\.[^.]+$/, '.jpg');
                            }
                            
                            const compressedFile = new File([blob], newFileName, {
                                type: targetType,
                                lastModified: Date.now()
                            });
                            
                            // 详细的压缩日志
                            const sizeInfo = `${(originalSize / 1024).toFixed(2)}KB -> ${(compressedSize / 1024).toFixed(2)}KB`;
                            const typeInfo = targetType !== originalType ? ` [${originalType}→${targetType}]` : '';
                            const resizeInfo = needResize ? ` [尺寸: ${img.width}x${img.height}→${width}x${height}]` : '';
                            
                            if (compressedSize < originalSize) {
                                console.log(`✅ [压缩成功+EXIF已清除] ${file.name}: ${sizeInfo}${typeInfo}${resizeInfo} (减少${ratio}%, 质量${Math.round(quality * 100)}%)`);
                                resolve(compressedFile);
                            } else if (needResize) {
                                // 即使文件稍大，但如果尺寸变小了，也使用压缩后的文件
                                console.log(`⚠️ [尺寸优化+EXIF已清除] ${file.name}: ${sizeInfo}${typeInfo}${resizeInfo} (质量${Math.round(quality * 100)}%)`);
                                resolve(compressedFile);
                            } else {
                                // 文件变大且尺寸没变
                                // 智能检测：如果启用且无敏感EXIF，使用原图
                                if (smartDetection && exifInfo && !exifInfo.hasSensitiveInfo) {
                                    console.log(`🎯 [智能识别-使用原图] ${file.name}: ${sizeInfo} - 无敏感EXIF，保留原图`);
                                    resolve(file);
                                } else {
                                    // 返回Canvas处理后的文件（已清除EXIF）
                                    console.log(`🔒 [EXIF已清除] ${file.name}: ${sizeInfo} (质量${Math.round(quality * 100)}%) - 文件稍大但已清除隐私信息`);
                                    resolve(compressedFile);
                                }
                            }
                        } else {
                            console.error('❌ [压缩失败] Blob转换失败');
                            reject(new Error('图片压缩失败'));
                        }
                    }, targetType, quality);
                } catch (error) {
                    console.error('❌ [压缩错误]', error);
                    resolve(file);
                }
            };
            
            img.onerror = function() {
                console.error('❌ [加载失败] 图片无法加载');
                resolve(file);
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = function() {
            console.error('❌ [读取失败] 文件无法读取');
            resolve(file);
        };
        
        reader.readAsDataURL(file);
    });
};

// 标记模块已加载
if (typeof window !== 'undefined') {
    window.imageCompressModuleLoaded = true;
    console.log('✅ 图片压缩模块已加载');
}

