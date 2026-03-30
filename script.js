// 全局变量
let quill;
let currentUser = null;
let users = [];
let articles = [];
let comments = [];
let likes = [];
let blockedTags = [];

// Gist配置
const GIST_ID = 'd5840429b68a74b4dbfe77278d571209';
const GIST_RAW_URL = `https://gist.githubusercontent.com/Odazai99/${GIST_ID}/raw/data.json`;

// 初始化函数
function init() {
    // 初始化富文本编辑器
    quill = new Quill('#editor', {
        theme: 'snow',
        placeholder: '请输入文章内容...'
    });

    // 加载数据
    loadData();

    // 绑定事件
    bindEvents();

    // 显示首页
    showSection('home');
}

// 从Gist加载数据
async function loadData() {
    try {
        const response = await fetch(GIST_RAW_URL + '?t=' + Date.now()); // 添加时间戳避免缓存
        if (response.ok) {
            const data = await response.json();
            users = data.users || [];
            articles = data.articles || [];
            comments = data.comments || [];
            likes = data.likes || [];
            blockedTags = data.blockedTags || [];
            
            // 如果没有用户数据，初始化默认管理员账户
            if (users.length === 0) {
                users = [{ username: 'admin', password: 'admin123', nickname: '管理员' }];
                await saveDataToGist();
            }
            
            // 渲染文章列表
            renderArticles(articles);
        } else {
            console.error('Failed to load data from Gist');
            // 使用默认数据
            users = [{ username: 'admin', password: 'admin123', nickname: '管理员' }];
            articles = [];
            comments = [];
            likes = [];
            blockedTags = [];
            renderArticles(articles);
        }
    } catch (error) {
        console.error('Error loading data:', error);
        // 使用默认数据
        users = [{ username: 'admin', password: 'admin123', nickname: '管理员' }];
        articles = [];
        comments = [];
        likes = [];
        blockedTags = [];
        renderArticles(articles);
    }
    
    // 加载本地用户状态（保持登录状态）
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUI();
        updateCommentForm();
    }
}

// 保存数据到Gist（通过GitHub API）
async function saveDataToGist() {
    const data = {
        users,
        articles,
        comments,
        likes,
        blockedTags
    };
    
    // 由于GitHub API需要认证，这里我们创建一个下载链接让用户手动更新
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    // 存储到localStorage作为备份
    localStorage.setItem('websiteData', dataStr);
    
    // 显示提示信息
    console.log('Data prepared for Gist update. Please manually update the Gist with the latest data.');
    console.log('Current data:', data);
    
    return true;
}

// 保存数据（兼容旧版本，同时尝试保存到Gist）
function saveData() {
    // 保存到localStorage作为备份
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('articles', JSON.stringify(articles));
    localStorage.setItem('comments', JSON.stringify(comments));
    localStorage.setItem('likes', JSON.stringify(likes));
    localStorage.setItem('blockedTags', JSON.stringify(blockedTags));
    if (currentUser) {
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
    
    // 尝试保存到Gist
    saveDataToGist();
}

// 导出数据到剪贴板
function exportDataToClipboard() {
    const data = {
        users,
        articles,
        comments,
        likes,
        blockedTags
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    
    // 复制到剪贴板
    navigator.clipboard.writeText(dataStr).then(() => {
        const statusDiv = document.getElementById('export-status');
        statusDiv.textContent = '数据已成功复制到剪贴板！请粘贴到 Gist 中。';
        statusDiv.style.color = '#27ae60';
        setTimeout(() => {
            statusDiv.textContent = '';
        }, 5000);
    }).catch(err => {
        console.error('复制失败:', err);
        // 备用方案：显示在文本框中
        const statusDiv = document.getElementById('export-status');
        statusDiv.innerHTML = '自动复制失败，请手动复制以下数据：<br><textarea id="manual-export" rows="10" style="width: 100%; margin-top: 10px;">' + dataStr + '</textarea>';
        statusDiv.style.color = '#e74c3c';
    });
}

// 更新管理页面统计
function updateAdminStats() {
    document.getElementById('article-count').textContent = articles.length;
    document.getElementById('comment-count').textContent = comments.length;
    document.getElementById('user-count').textContent = users.length;
    document.getElementById('like-count').textContent = likes.length;
    
    // 更新当前登录信息
    if (currentUser) {
        document.getElementById('current-username').textContent = currentUser.username;
        document.getElementById('current-nickname').textContent = currentUser.nickname;
        document.getElementById('admin-status').textContent = isAdmin() ? '是' : '否';
        document.getElementById('admin-status').style.color = isAdmin() ? '#27ae60' : '#e74c3c';
    } else {
        document.getElementById('current-username').textContent = '未登录';
        document.getElementById('current-nickname').textContent = '-';
        document.getElementById('admin-status').textContent = '否';
        document.getElementById('admin-status').style.color = '#e74c3c';
    }
}

// 检查是否为管理员
function isAdmin() {
    return currentUser && currentUser.username === 'admin';
}

// 绑定事件
function bindEvents() {
    // 导航链接
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            showSection(target);
        });
    });

    // 登录表单
    document.getElementById('login-form').addEventListener('submit', function(e) {
        e.preventDefault();
        login();
    });

    // 注册表单
    document.getElementById('register-form').addEventListener('submit', function(e) {
        e.preventDefault();
        register();
    });

    // 文章表单
    document.getElementById('article-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addArticle();
    });

    // 评论表单
    document.getElementById('comment-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addComment();
    });

    // 搜索按钮
    document.getElementById('search-btn').addEventListener('click', function() {
        searchArticles();
    });

    // 搜索输入框回车
    document.getElementById('search-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchArticles();
        }
    });

    // 退出登录
    document.getElementById('logout-btn').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });

    // 导出数据按钮
    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportDataToClipboard);
    }

    // 点赞按钮（使用事件委托）
    document.addEventListener('click', function(e) {
        if (e.target.closest('.like-btn')) {
            const btn = e.target.closest('.like-btn');
            const articleId = parseInt(btn.dataset.id);
            likeArticle(articleId);
        }
        
        // 标签点击事件
        if (e.target.classList.contains('tag')) {
            const tag = e.target.dataset.tag;
            showArticlesByTag(tag);
            e.stopPropagation();
        }
    });
}

// 显示指定 section
function showSection(sectionId) {
    // 隐藏所有 section
    document.querySelectorAll('main section').forEach(section => {
        section.style.display = 'none';
    });

    // 显示指定 section
    document.getElementById(sectionId).style.display = 'block';

    // 特殊处理
    if (sectionId === 'add-article' && !isAdmin()) {
        showSection('login');
        alert('只有管理员可以发布文章');
        return;
    }
    
    // 管理员页面权限检查
    if (sectionId === 'admin' && !isAdmin()) {
        showSection('login');
        alert('只有管理员可以访问管理页面');
        return;
    }
    
    // 更新评论表单
    if (sectionId === 'article-detail') {
        updateCommentForm();
    }
    
    // 更新管理页面统计
    if (sectionId === 'admin') {
        updateAdminStats();
    }
}

// 获取设备ID
function getDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
}

// 检查设备是否已注册
function hasDeviceRegistered() {
    return localStorage.getItem('hasRegistered') === 'true';
}

// 注册
function register() {
    // 检查设备是否已注册
    if (hasDeviceRegistered()) {
        alert('该设备只能注册一个账号');
        return;
    }

    const username = document.getElementById('register-username').value;
    const nickname = document.getElementById('register-nickname').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;

    // 验证密码
    if (password !== confirmPassword) {
        alert('两次输入的密码不一致');
        return;
    }

    // 检查用户名是否已存在
    const existingUser = users.find(user => user.username === username);
    if (existingUser) {
        alert('用户名已存在');
        return;
    }

    // 添加新用户
    users.push({ username, password, nickname });
    saveData();
    
    // 标记设备已注册
    localStorage.setItem('hasRegistered', 'true');
    
    alert('注册成功，请登录');
    showSection('login');

    // 重置表单
    document.getElementById('register-username').value = '';
    document.getElementById('register-nickname').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-confirm-password').value = '';
}

// 点赞文章
function likeArticle(articleId) {
    // 获取用户标识（登录用户或设备ID）
    const userId = currentUser ? currentUser.username : getDeviceId();

    const article = articles.find(a => a.id === articleId);
    if (article) {
        // 检查用户是否已经点赞
        const existingLike = likes.find(like => like.userId === userId && like.articleId === articleId);
        
        if (existingLike) {
            // 取消点赞
            likes = likes.filter(like => !(like.userId === userId && like.articleId === articleId));
            article.likes = Math.max(0, (article.likes || 0) - 1);
        } else {
            // 添加点赞
            likes.push({ userId, articleId });
            article.likes = (article.likes || 0) + 1;
        }
        
        saveData();
        updateLikeUI(articleId, article.likes, !existingLike);
    }
}

// 更新点赞UI
function updateLikeUI(articleId, likeCount, isLiked) {
    const likeBtns = document.querySelectorAll(`.like-btn[data-id="${articleId}"]`);
    likeBtns.forEach(btn => {
        const likeCountElement = btn.querySelector('.like-count');
        likeCountElement.textContent = likeCount;
        
        const likeIcon = btn.querySelector('.like-icon');
        if (isLiked) {
            // 点赞动画
            likeIcon.style.color = '#e74c3c';
            likeIcon.style.transform = 'scale(1.2)';
            setTimeout(() => {
                likeIcon.style.transform = 'scale(1)';
            }, 300);
        } else {
            // 取消点赞
            likeIcon.style.color = '#999';
        }
    });
}

// 显示指定标签的文章
function showArticlesByTag(tag) {
    const tagArticles = articles.filter(article => article.tags && article.tags.includes(tag));
    
    // 显示标签文章
    const container = document.getElementById('articles-container');
    container.innerHTML = '';
    
    if (tagArticles.length === 0) {
        container.innerHTML = `<p>暂无标签为 "${tag}" 的文章</p>`;
        return;
    }
    
    // 显示标签标题和屏蔽按钮
    const tagHeader = document.createElement('div');
    tagHeader.className = 'tag-header';
    tagHeader.innerHTML = `
        <h2>标签: ${tag}</h2>
        <button class="block-tag-btn" data-tag="${tag}">屏蔽此标签</button>
    `;
    container.appendChild(tagHeader);
    
    // 渲染文章列表
    tagArticles.forEach(article => {
        const card = document.createElement('div');
        card.className = 'article-card';
        card.addEventListener('click', () => showArticleDetail(article.id));

        // 提取摘要
        const excerpt = article.content.replace(/<[^>]+>/g, '').substring(0, 100) + '...';

        // 检查用户是否已经点赞
        const userId = currentUser ? currentUser.username : getDeviceId();
        const isLiked = likes.some(like => like.userId === userId && like.articleId === article.id);
        const likeIconColor = isLiked ? '#e74c3c' : '#999';

        // 生成标签HTML
        const tagsHtml = article.tags && article.tags.length > 0 ? 
            `<div class="tags">
                ${article.tags.map(t => `<span class="tag" data-tag="${t}">${t}</span>`).join(' ')}
            </div>` : '';

        card.innerHTML = `
            <h3>${article.title}</h3>
            <div class="meta">作者: ${article.author} | 发布时间: ${formatDate(article.createdAt)}</div>
            ${tagsHtml}
            <div class="excerpt">${excerpt}</div>
            <div class="like-container">
                <button class="like-btn" data-id="${article.id}">
                    <span class="like-icon" style="color: ${likeIconColor};">❤</span>
                    <span class="like-count">${article.likes || 0}</span>
                </button>
            </div>
        `;

        container.appendChild(card);
    });
    
    // 添加屏蔽标签按钮事件
    const blockTagBtn = document.querySelector('.block-tag-btn');
    if (blockTagBtn) {
        blockTagBtn.addEventListener('click', function() {
            const tagToBlock = this.dataset.tag;
            blockTag(tagToBlock);
        });
    }
}

// 屏蔽标签
function blockTag(tag) {
    if (!blockedTags.includes(tag)) {
        blockedTags.push(tag);
        saveData();
        alert(`已屏蔽标签 "${tag}"`);
        // 重新渲染文章列表
        renderArticles(articles);
    }
}

// 登录
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // 验证用户
    const user = users.find(user => user.username === username && user.password === password);
    if (user) {
        currentUser = { username, nickname: user.nickname };
        updateUI();
        updateCommentForm();
        saveData();
        showSection('home');
        alert('登录成功');
    } else {
        alert('用户名或密码错误');
    }
}

// 退出登录
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateUI();
    updateCommentForm();
    showSection('home');
    alert('已退出登录');
}

// 更新 UI
function updateUI() {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const adminBtn = document.getElementById('admin-btn');
    const addArticleBtn = document.getElementById('add-article-btn');
    
    if (currentUser) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        
        // 只有管理员显示管理按钮和添加文章按钮
        if (isAdmin()) {
            adminBtn.style.display = 'block';
            addArticleBtn.style.display = 'block';
        } else {
            adminBtn.style.display = 'none';
            addArticleBtn.style.display = 'none';
        }
    } else {
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        adminBtn.style.display = 'none';
        addArticleBtn.style.display = 'none';
    }
}

// 更新评论表单
function updateCommentForm() {
    const commentForm = document.getElementById('comment-form');
    const authorInput = document.getElementById('comment-author');
    
    if (currentUser) {
        // 已登录，隐藏作者输入框，使用当前用户昵称
        authorInput.style.display = 'none';
        authorInput.value = currentUser.nickname;
    } else {
        // 未登录，显示提示
        authorInput.style.display = 'block';
        authorInput.value = '';
    }
}

// 添加文章
function addArticle() {
    const title = document.getElementById('title').value;
    const tagsInput = document.getElementById('tags').value;
    const content = quill.root.innerHTML;

    // 处理标签
    const tags = tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag !== '');

    const article = {
        id: Date.now(),
        title,
        author: currentUser.nickname,
        content,
        tags,
        createdAt: new Date().toISOString()
    };

    articles.unshift(article);
    saveData();
    renderArticles(articles);
    showSection('home');
    alert('文章发布成功');

    // 重置表单
    document.getElementById('title').value = '';
    document.getElementById('tags').value = '';
    quill.root.innerHTML = '';
}

// 渲染文章列表
function renderArticles(articleList) {
    const container = document.getElementById('articles-container');
    container.innerHTML = '';

    // 过滤掉用户屏蔽的标签的文章
    const filteredArticles = articleList.filter(article => {
        // 如果没有屏蔽标签，或者文章没有标签，或者文章的标签都不在屏蔽列表中
        return blockedTags.length === 0 || !article.tags || !article.tags.some(tag => blockedTags.includes(tag));
    });

    if (filteredArticles.length === 0) {
        container.innerHTML = '<p>暂无文章</p>';
        return;
    }

    filteredArticles.forEach(article => {
        const card = document.createElement('div');
        card.className = 'article-card';
        card.addEventListener('click', () => showArticleDetail(article.id));

        // 提取摘要
        const excerpt = article.content.replace(/<[^>]+>/g, '').substring(0, 100) + '...';

        // 检查用户是否已经点赞
        const userId = currentUser ? currentUser.username : getDeviceId();
        const isLiked = likes.some(like => like.userId === userId && like.articleId === article.id);
        const likeIconColor = isLiked ? '#e74c3c' : '#999';

        // 生成标签HTML
        const tagsHtml = article.tags && article.tags.length > 0 ? 
            `<div class="tags">
                ${article.tags.map(tag => `<span class="tag" data-tag="${tag}">${tag}</span>`).join(' ')}
            </div>` : '';

        card.innerHTML = `
            <h3>${article.title}</h3>
            <div class="meta">作者: ${article.author} | 发布时间: ${formatDate(article.createdAt)}</div>
            ${tagsHtml}
            <div class="excerpt">${excerpt}</div>
            <div class="like-container">
                <button class="like-btn" data-id="${article.id}">
                    <span class="like-icon" style="color: ${likeIconColor};">❤</span>
                    <span class="like-count">${article.likes || 0}</span>
                </button>
            </div>
        `;

        container.appendChild(card);
    });
}

// 显示文章详情
function showArticleDetail(articleId) {
    const article = articles.find(a => a.id === articleId);
    if (!article) return;

    // 检查用户是否已经点赞
    const userId = currentUser ? currentUser.username : getDeviceId();
    const isLiked = likes.some(like => like.userId === userId && like.articleId === article.id);
    const likeIconColor = isLiked ? '#e74c3c' : '#999';

    // 生成标签HTML
    const tagsHtml = article.tags && article.tags.length > 0 ? 
        `<div class="tags">
            ${article.tags.map(tag => `<span class="tag" data-tag="${tag}">${tag}</span>`).join(' ')}
        </div>` : '';

    const container = document.getElementById('article-content');
    container.innerHTML = `
        <h2>${article.title}</h2>
        <div class="meta">作者: ${article.author} | 发布时间: ${formatDate(article.createdAt)}</div>
        ${tagsHtml}
        <div class="like-container">
            <button class="like-btn" data-id="${article.id}">
                <span class="like-icon" style="color: ${likeIconColor};">❤</span>
                <span class="like-count">${article.likes || 0}</span>
            </button>
        </div>
        <div class="content">${article.content}</div>
    `;

    // 渲染评论
    renderComments(articleId);

    // 存储当前文章ID
    localStorage.setItem('currentArticleId', articleId);

    showSection('article-detail');
}

// 渲染评论
function renderComments(articleId) {
    const container = document.getElementById('comments-container');
    const articleComments = comments.filter(c => c.articleId === articleId);

    container.innerHTML = '';

    if (articleComments.length === 0) {
        container.innerHTML = '<p>暂无评论</p>';
        return;
    }

    articleComments.forEach(comment => {
        const commentElement = document.createElement('div');
        commentElement.className = 'comment';
        commentElement.innerHTML = `
            <div class="author">${comment.author}</div>
            <div class="date">${formatDate(comment.createdAt)}</div>
            <div class="content">${comment.content}</div>
        `;
        container.appendChild(commentElement);
    });
}

// 添加评论
function addComment() {
    // 检查用户是否登录
    if (!currentUser) {
        alert('请先登录后再评论');
        showSection('login');
        return;
    }

    const articleId = parseInt(localStorage.getItem('currentArticleId'));
    const content = document.getElementById('comment-content').value;

    const comment = {
        id: Date.now(),
        articleId,
        author: currentUser.nickname, // 使用登录用户的昵称
        content,
        createdAt: new Date().toISOString()
    };

    comments.push(comment);
    saveData();
    renderComments(articleId);
    alert('评论提交成功');

    // 重置表单
    document.getElementById('comment-content').value = '';
}

// 搜索文章
function searchArticles() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const filteredArticles = articles.filter(article => 
        article.title.toLowerCase().includes(searchTerm) ||
        article.content.toLowerCase().includes(searchTerm) ||
        article.author.toLowerCase().includes(searchTerm) ||
        (article.tags && article.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
    );
    
    // 直接渲染搜索结果，不考虑屏蔽标签
    const container = document.getElementById('articles-container');
    container.innerHTML = '';

    if (filteredArticles.length === 0) {
        container.innerHTML = '<p>没有找到相关文章</p>';
        return;
    }

    filteredArticles.forEach(article => {
        const card = document.createElement('div');
        card.className = 'article-card';
        card.addEventListener('click', () => showArticleDetail(article.id));

        // 提取摘要
        const excerpt = article.content.replace(/<[^>]+>/g, '').substring(0, 100) + '...';

        // 检查用户是否已经点赞
        const userId = currentUser ? currentUser.username : getDeviceId();
        const isLiked = likes.some(like => like.userId === userId && like.articleId === article.id);
        const likeIconColor = isLiked ? '#e74c3c' : '#999';

        // 生成标签HTML
        const tagsHtml = article.tags && article.tags.length > 0 ? 
            `<div class="tags">
                ${article.tags.map(tag => `<span class="tag" data-tag="${tag}">${tag}</span>`).join(' ')}
            </div>` : '';

        card.innerHTML = `
            <h3>${article.title}</h3>
            <div class="meta">作者: ${article.author} | 发布时间: ${formatDate(article.createdAt)}</div>
            ${tagsHtml}
            <div class="excerpt">${excerpt}</div>
            <div class="like-container">
                <button class="like-btn" data-id="${article.id}">
                    <span class="like-icon" style="color: ${likeIconColor};">❤</span>
                    <span class="like-count">${article.likes || 0}</span>
                </button>
            </div>
        `;

        container.appendChild(card);
    });
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 初始化
window.addEventListener('DOMContentLoaded', init);
