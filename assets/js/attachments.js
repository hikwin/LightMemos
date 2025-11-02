// 附件管理：独立脚本
let attachmentViewMode = 'grid';
let attachmentPage = 1;
let attachmentPerPage = 15;

// 恢复本地设置
(function initAttachmentPrefs() {
	try {
		const savedViewMode = localStorage.getItem('attachmentViewMode');
		if (savedViewMode) attachmentViewMode = savedViewMode;
		const savedPerPage = localStorage.getItem('attachmentPerPage');
		if (savedPerPage) attachmentPerPage = parseInt(savedPerPage);
	} catch (e) {}
})();

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
			<button class="view-toggle-btn" onclick="cleanUnusedImages()" title="清理未引用的图片" style="margin-left: 8px;">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="3 6 5 6 21 6"></polyline>
					<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
					<line x1="10" y1="11" x2="10" y2="17"></line>
					<line x1="14" y1="11" x2="14" y2="17"></line>
				</svg>
			</button>
		</div>
	`;
}

async function loadAttachments(searchTerm = '', fileType = 'all', page = 1) {
	const memoList = document.getElementById('memoList');
	const loadMore = document.querySelector('.load-more');
	const memoEditor = document.querySelector('.memo-editor');
	attachmentPage = page;
	if (loadMore) loadMore.style.display = 'none';
	if (memoEditor) memoEditor.style.display = 'none';
	memoList.innerHTML = getAttachmentSearchHtml(searchTerm, fileType) + '<div class="loading"><div class="spinner"></div></div>';
	try {
		const params = new URLSearchParams({ page: page, limit: attachmentPerPage });
		if (searchTerm) params.append('search', searchTerm);
		const response = await fetch(`api.php?action=attachments&${params.toString()}`);
		const result = await response.json();
		if (result.data && result.data.length > 0) {
			let filteredData = result.data;
			let actualTotal = result.total || result.data.length;
			if (fileType !== 'all') {
				filteredData = result.data.filter(att => matchFileType(att.original_name, att.file_type, fileType));
				if (filteredData.length < result.data.length) actualTotal = filteredData.length;
			}
			let html = '';
			if (attachmentViewMode === 'list') {
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
							<div class="attachment-list-info" onclick="${isImage ? `previewAttachmentImage('${att.url}', '${att.original_name.replace(/'/g, "\\'")}' )` : `window.location.href='${att.url}'`}" style="cursor: pointer;">
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
						</div>`;
				});
				html += '</div>';
			} else {
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
							</div>`;
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
							</div>`;
					}
				});
				html += '</div>';
			}
			if (filteredData.length === 0) {
				memoList.innerHTML = getAttachmentSearchHtml(searchTerm, fileType) + '<div class="empty-state"><p>没有找到匹配的附件</p></div>';
			} else {
				const totalPages = Math.ceil(actualTotal / attachmentPerPage);
				const paginationHtml = generateAttachmentPagination(page, totalPages, actualTotal, filteredData.length);
				memoList.innerHTML = getAttachmentSearchHtml(searchTerm, fileType) + html + paginationHtml;
			}
			setupAttachmentSearchEvents();
		} else {
			memoList.innerHTML = getAttachmentSearchHtml(searchTerm, fileType) + `<div class="empty-state"><p>${searchTerm ? '没有找到匹配的附件' : '还没有附件'}</p></div>`;
			setupAttachmentSearchEvents();
		}
	} catch (error) {
		console.error('加载附件失败:', error);
		memoList.innerHTML = getAttachmentSearchHtml(searchTerm, fileType) + '<div class="empty-state"><p>加载失败</p></div>';
		setupAttachmentSearchEvents();
	}
}

function matchFileType(filename, mimeType, category) {
	const ext = filename.toLowerCase().split('.').pop();
	const categories = {
		image: { mimes: ['image/'], exts: ['jpg','jpeg','png','gif','bmp','webp','svg','ico','tiff','tif'] },
		text: { mimes: ['text/'], exts: ['txt','md','markdown','json','xml','html','htm','css','js','ts','jsx','tsx','vue','py','java','c','cpp','h','hpp','go','rs','php','rb','sh','bat','cmd','ps1','sql','yaml','yml','toml','ini','conf','log'] },
		document: { mimes: ['application/pdf','application/msword','application/vnd.ms-','application/vnd.openxmlformats-officedocument'], exts: ['pdf','doc','docx','xls','xlsx','ppt','pptx','odt','ods','odp','rtf','tex','epub','mobi'] },
		archive: { mimes: ['application/zip','application/x-zip','application/x-rar','application/x-7z','application/x-tar','application/gzip'], exts: ['zip','rar','7z','tar','gz','bz2','xz','tgz','tbz2','txz','iso','dmg'] }
	};
	const cat = categories[category];
	if (!cat) return false;
	if (mimeType) {
		for (const mime of cat.mimes) {
			if (mimeType.toLowerCase().includes(mime.toLowerCase())) return true;
		}
	}
	return cat.exts.includes(ext);
}

function generateAttachmentPagination(currentPage, totalPages, totalCount, currentCount) {
	if (totalPages <= 1) return '';
	let html = '<div class="attachment-pagination">';
	html += `<div class="pagination-info">显示 ${currentCount} / ${totalCount} 个附件</div>`;
	html += '<div class="pagination-controls">';
	html += `
		<select class="per-page-select" onchange="changeAttachmentPerPage(this.value)">
			<option value="15" ${attachmentPerPage === 15 ? 'selected' : ''}>15条/页</option>
			<option value="30" ${attachmentPerPage === 30 ? 'selected' : ''}>30条/页</option>
			<option value="45" ${attachmentPerPage === 45 ? 'selected' : ''}>45条/页</option>
			<option value="60" ${attachmentPerPage === 60 ? 'selected' : ''}>60条/页</option>
			<option value="90" ${attachmentPerPage === 90 ? 'selected' : ''}>90条/页</option>
		</select>
	`;
	html += `
		<button class="pagination-btn" onclick="loadAttachmentPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="15 18 9 12 15 6"></polyline>
			</svg>
		</button>
	`;
	html += `<span class="page-number">第 ${currentPage} / ${totalPages} 页</span>`;
	html += `
		<button class="pagination-btn" onclick="loadAttachmentPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="9 18 15 12 9 6"></polyline>
			</svg>
		</button>
	`;
	html += '</div></div>';
	return html;
}

function loadAttachmentPage(page) {
	const searchInput = document.getElementById('attachmentSearchInput');
	const typeFilter = document.getElementById('attachmentTypeFilter');
	const searchTerm = searchInput ? searchInput.value.trim() : '';
	const fileType = typeFilter ? typeFilter.value : 'all';
	loadAttachments(searchTerm, fileType, page);
}

function changeAttachmentPerPage(perPage) {
	attachmentPerPage = parseInt(perPage);
	try { localStorage.setItem('attachmentPerPage', attachmentPerPage); } catch (e) {}
	const searchInput = document.getElementById('attachmentSearchInput');
	const typeFilter = document.getElementById('attachmentTypeFilter');
	const searchTerm = searchInput ? searchInput.value.trim() : '';
	const fileType = typeFilter ? typeFilter.value : 'all';
	loadAttachments(searchTerm, fileType, 1);
}

function switchAttachmentView(mode) {
	attachmentViewMode = mode;
	try { localStorage.setItem('attachmentViewMode', mode); } catch (e) {}
	const searchInput = document.getElementById('attachmentSearchInput');
	const typeFilter = document.getElementById('attachmentTypeFilter');
	const searchTerm = searchInput ? searchInput.value.trim() : '';
	const fileType = typeFilter ? typeFilter.value : 'all';
	loadAttachments(searchTerm, fileType, attachmentPage);
}

function formatFileSize(bytes) {
	if (!bytes || bytes === 0) return '0 B';
	const k = 1024; const sizes = ['B','KB','MB','GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

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
		if (lightboxPrev) lightboxPrev.style.display = 'none';
		if (lightboxNext) lightboxNext.style.display = 'none';
		if (lightboxCounter) lightboxCounter.style.display = 'none';
	}
}

function searchAttachments() {
	const searchInput = document.getElementById('attachmentSearchInput');
	const typeFilter = document.getElementById('attachmentTypeFilter');
	if (searchInput && typeFilter) {
		const searchTerm = searchInput.value.trim();
		const fileType = typeFilter.value;
		loadAttachments(searchTerm, fileType, 1);
	}
}

function setupAttachmentSearchEvents() {
	const searchInput = document.getElementById('attachmentSearchInput');
	if (searchInput) {
		searchInput.addEventListener('keypress', function(e) {
			if (e.key === 'Enter') searchAttachments();
		});
	}
}

async function deleteAttachment(attachmentId, attachmentName) {
	try {
		const checkResponse = await fetch(`api.php?action=attachments&check_reference=1&id=${attachmentId}`);
		const checkResult = await checkResponse.json();
		if (!checkResult.success) { if (typeof showToast === 'function') showToast('检查附件引用失败', 'error'); return; }
		let confirmMessage = '';
		if (checkResult.is_referenced) {
			confirmMessage = `附件"${attachmentName}"被 ${checkResult.reference_count} 篇文章引用。\n\n删除后，这些文章中的附件链接将失效。\n\n确定要删除吗？`;
		} else {
			confirmMessage = `确定要删除附件"${attachmentName}"吗？`;
		}
		if (!confirm(confirmMessage)) return;
		const deleteResponse = await fetch('api.php?action=attachments', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: attachmentId }) });
		const deleteResult = await deleteResponse.json();
		if (deleteResult.success) {
			if (typeof showToast === 'function') showToast('附件删除成功', 'success');
			const searchInput = document.getElementById('attachmentSearchInput');
			const typeFilter = document.getElementById('attachmentTypeFilter');
			const searchTerm = searchInput ? searchInput.value.trim() : '';
			const fileType = typeFilter ? typeFilter.value : 'all';
			loadAttachments(searchTerm, fileType, attachmentPage);
		} else {
			if (typeof showToast === 'function') showToast('删除失败: ' + (deleteResult.error || '未知错误'), 'error');
		}
	} catch (error) {
		console.error('删除附件失败:', error);
		if (typeof showToast === 'function') showToast('删除失败', 'error');
	}
}


