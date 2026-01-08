// Todo タスク管理アプリ

class TodoApp {
    constructor() {
        this.tasks = [];
        this.currentEditTask = null;
        this.currentMemoTask = null;
        this.draggedItem = null;
        this.maxDepth = 3;

        this.initElements();
        this.bindEvents();
        this.loadFromStorage();
        this.render();
    }

    initElements() {
        this.taskList = document.getElementById('taskList');
        this.addRootTaskBtn = document.getElementById('addRootTask');
        this.editModal = document.getElementById('editModal');
        this.confirmDialog = document.getElementById('confirmDialog');

        // モーダル要素
        this.taskTitleInput = document.getElementById('taskTitle');
        this.bandColorInput = document.getElementById('bandColor');
        this.textColorInput = document.getElementById('textColor');
        this.fontSizeSelect = document.getElementById('fontSize');
        this.styleButtons = document.querySelectorAll('.style-btn');

        // エクスポート/インポート
        this.exportBtn = document.getElementById('exportData');
        this.importBtn = document.getElementById('importData');
        this.fileInput = document.getElementById('fileInput');

        // メモポップアップ
        this.memoPopup = document.getElementById('memoPopup');
        this.memoText = document.getElementById('memoText');

        // テキスト出力モーダル
        this.textExportModal = document.getElementById('textExportModal');
        this.textExportContent = document.getElementById('textExportContent');
        this.currentExportFormat = 'markdown';
    }

    bindEvents() {
        // 新規タスク追加
        this.addRootTaskBtn.addEventListener('click', () => this.openEditModal(null, null));

        // エクスポート/インポート
        this.exportBtn.addEventListener('click', () => this.exportData());
        this.importBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.importData(e));

        // テキスト出力
        document.getElementById('exportText').addEventListener('click', () => this.openTextExportModal());
        document.getElementById('closeTextExport').addEventListener('click', () => this.closeTextExportModal());
        document.getElementById('copyTextExport').addEventListener('click', () => this.copyTextExport());
        document.getElementById('downloadTextExport').addEventListener('click', () => this.downloadTextExport());

        // タブ切り替え
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentExportFormat = btn.dataset.format;
                this.updateTextExportContent();
            });
        });

        // モーダル操作
        document.getElementById('closeModal').addEventListener('click', () => this.closeEditModal());
        document.getElementById('cancelEdit').addEventListener('click', () => this.closeEditModal());
        document.getElementById('saveTask').addEventListener('click', () => this.saveTask());

        // タイトル入力でEnterキーで保存
        this.taskTitleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.saveTask();
            }
        });

        // カラークリアボタン
        document.getElementById('clearBandColor').addEventListener('click', () => {
            this.bandColorInput.value = '#3498db';
        });
        document.getElementById('clearTextColor').addEventListener('click', () => {
            this.textColorInput.value = '#333333';
        });

        // スタイルボタン
        this.styleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
            });
        });

        // 確認ダイアログ
        document.getElementById('confirmCancel').addEventListener('click', () => this.closeConfirmDialog());

        // モーダル外クリックで閉じる
        this.editModal.addEventListener('click', (e) => {
            if (e.target === this.editModal) this.closeEditModal();
        });
        this.confirmDialog.addEventListener('click', (e) => {
            if (e.target === this.confirmDialog) this.closeConfirmDialog();
        });

        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeEditModal();
                this.closeConfirmDialog();
                this.closeMemoPopup();
                this.closeTextExportModal();
            }
        });

        // テキスト出力モーダル外クリック
        this.textExportModal.addEventListener('click', (e) => {
            if (e.target === this.textExportModal) this.closeTextExportModal();
        });

        // メモポップアップ
        document.getElementById('closeMemo').addEventListener('click', () => this.closeMemoPopup());
        document.getElementById('saveMemo').addEventListener('click', () => this.saveMemo());

        // ポップアップ外クリックで閉じる
        document.addEventListener('click', (e) => {
            if (this.memoPopup && !this.memoPopup.classList.contains('hidden')) {
                if (!this.memoPopup.contains(e.target) && !e.target.classList.contains('memo-btn')) {
                    this.closeMemoPopup();
                }
            }
        });
    }

    // ストレージ操作
    loadFromStorage() {
        const stored = localStorage.getItem('todoTasks');
        if (stored) {
            try {
                this.tasks = JSON.parse(stored);
            } catch (e) {
                this.tasks = [];
            }
        }
    }

    saveToStorage() {
        localStorage.setItem('todoTasks', JSON.stringify(this.tasks));
    }

    // エクスポート（JSONファイルとしてダウンロード）
    exportData() {
        const data = JSON.stringify(this.tasks, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `todo-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // インポート（JSONファイルを読み込み）
    importData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (Array.isArray(imported)) {
                    this.openConfirmDialog(
                        '現在のデータを上書きしますか？',
                        () => {
                            this.tasks = imported;
                            this.saveToStorage();
                            this.render();
                        }
                    );
                    // 確認ダイアログのボタンテキストを変更
                    document.getElementById('confirmOk').textContent = '上書き';
                } else {
                    alert('無効なファイル形式です');
                }
            } catch (err) {
                alert('ファイルの読み込みに失敗しました');
            }
        };
        reader.readAsText(file);

        // 同じファイルを再選択できるようにリセット
        e.target.value = '';
    }

    // タスク操作
    generateId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    findTask(id, tasks = this.tasks) {
        for (const task of tasks) {
            if (task.id === id) return task;
            if (task.children) {
                const found = this.findTask(id, task.children);
                if (found) return found;
            }
        }
        return null;
    }

    findParent(id, tasks = this.tasks, parent = null) {
        for (const task of tasks) {
            if (task.id === id) return { parent, list: tasks };
            if (task.children) {
                const found = this.findParent(id, task.children, task);
                if (found) return found;
            }
        }
        return null;
    }

    getTaskDepth(id, tasks = this.tasks, depth = 1) {
        for (const task of tasks) {
            if (task.id === id) return depth;
            if (task.children) {
                const found = this.getTaskDepth(id, task.children, depth + 1);
                if (found) return found;
            }
        }
        return null;
    }

    createTask(parentId = null) {
        return {
            id: this.generateId(),
            title: '新しいタスク',
            completed: false,
            collapsed: false,
            memo: '',
            children: [],
            style: {
                bandColor: null,
                textColor: null,
                fontSize: 'medium',
                bold: false,
                italic: false,
                underline: false,
                strikethrough: false
            }
        };
    }

    addTask(parentId = null) {
        const newTask = this.createTask();

        if (parentId) {
            const parent = this.findTask(parentId);
            if (parent) {
                parent.children = parent.children || [];
                parent.children.push(newTask);
            }
        } else {
            this.tasks.push(newTask);
        }

        this.saveToStorage();
        this.render();
        return newTask;
    }

    deleteTask(id) {
        const result = this.findParent(id);
        if (result) {
            const index = result.list.findIndex(t => t.id === id);
            if (index !== -1) {
                result.list.splice(index, 1);
                this.saveToStorage();
                this.render();
            }
        }
    }

    toggleComplete(id) {
        const task = this.findTask(id);
        if (task) {
            task.completed = !task.completed;
            // 子タスクも同じ状態に
            this.setChildrenComplete(task, task.completed);
            this.saveToStorage();
            this.render();
        }
    }

    setChildrenComplete(task, completed) {
        if (task.children) {
            task.children.forEach(child => {
                child.completed = completed;
                this.setChildrenComplete(child, completed);
            });
        }
    }

    toggleCollapse(id) {
        const task = this.findTask(id);
        if (task) {
            task.collapsed = !task.collapsed;
            this.saveToStorage();
            this.render();
        }
    }

    // モーダル操作
    openEditModal(taskId, parentId) {
        this.currentEditTask = { taskId, parentId };

        if (taskId) {
            const task = this.findTask(taskId);
            if (task) {
                this.taskTitleInput.value = task.title;
                this.bandColorInput.value = task.style.bandColor || '#3498db';
                this.textColorInput.value = task.style.textColor || '#333333';
                this.fontSizeSelect.value = task.style.fontSize || 'medium';

                this.styleButtons.forEach(btn => {
                    const style = btn.dataset.style;
                    btn.classList.toggle('active', task.style[style]);
                });
            }
        } else {
            // 新規タスク
            this.taskTitleInput.value = '';
            this.bandColorInput.value = '#3498db';
            this.textColorInput.value = '#333333';
            this.fontSizeSelect.value = 'medium';
            this.styleButtons.forEach(btn => btn.classList.remove('active'));
        }

        this.editModal.classList.remove('hidden');
        this.taskTitleInput.focus();
    }

    closeEditModal() {
        this.editModal.classList.add('hidden');
        this.currentEditTask = null;
    }

    saveTask() {
        const title = this.taskTitleInput.value.trim() || '新しいタスク';
        const style = {
            bandColor: this.bandColorInput.value !== '#3498db' ? this.bandColorInput.value : null,
            textColor: this.textColorInput.value !== '#333333' ? this.textColorInput.value : null,
            fontSize: this.fontSizeSelect.value,
            bold: document.querySelector('.style-btn[data-style="bold"]').classList.contains('active'),
            italic: document.querySelector('.style-btn[data-style="italic"]').classList.contains('active'),
            underline: document.querySelector('.style-btn[data-style="underline"]').classList.contains('active'),
            strikethrough: document.querySelector('.style-btn[data-style="strikethrough"]').classList.contains('active')
        };

        if (this.currentEditTask.taskId) {
            // 編集
            const task = this.findTask(this.currentEditTask.taskId);
            if (task) {
                task.title = title;
                task.style = style;
            }
        } else {
            // 新規作成
            const newTask = this.createTask();
            newTask.title = title;
            newTask.style = style;

            if (this.currentEditTask.parentId) {
                const parent = this.findTask(this.currentEditTask.parentId);
                if (parent) {
                    parent.children = parent.children || [];
                    parent.children.push(newTask);
                }
            } else {
                this.tasks.push(newTask);
            }
        }

        this.saveToStorage();
        this.render();
        this.closeEditModal();
    }

    // 確認ダイアログ
    openConfirmDialog(message, onConfirm) {
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmOk').onclick = () => {
            onConfirm();
            this.closeConfirmDialog();
        };
        this.confirmDialog.classList.remove('hidden');
    }

    closeConfirmDialog() {
        this.confirmDialog.classList.add('hidden');
        // ボタンテキストをデフォルトに戻す
        document.getElementById('confirmOk').textContent = '削除';
    }

    // メモポップアップ
    openMemoPopup(taskId, buttonElement) {
        const task = this.findTask(taskId);
        if (!task) return;

        this.currentMemoTask = taskId;
        this.memoText.value = task.memo || '';

        // ボタンの位置を基準にポップアップを配置
        const rect = buttonElement.getBoundingClientRect();
        const popupWidth = 300;

        let left = rect.left;
        let top = rect.bottom + 10;

        // 画面右端からはみ出る場合は調整
        if (left + popupWidth > window.innerWidth) {
            left = window.innerWidth - popupWidth - 20;
        }

        // 画面下端からはみ出る場合は上に表示
        if (top + 200 > window.innerHeight) {
            top = rect.top - 210;
            this.memoPopup.style.setProperty('--arrow-position', 'bottom');
        } else {
            this.memoPopup.style.setProperty('--arrow-position', 'top');
        }

        this.memoPopup.style.left = `${left}px`;
        this.memoPopup.style.top = `${top}px`;
        this.memoPopup.classList.remove('hidden');
        this.memoText.focus();
    }

    closeMemoPopup() {
        this.memoPopup.classList.add('hidden');
        this.currentMemoTask = null;
    }

    saveMemo() {
        if (!this.currentMemoTask) return;

        const task = this.findTask(this.currentMemoTask);
        if (task) {
            task.memo = this.memoText.value;
            this.saveToStorage();
            this.render();
        }
        this.closeMemoPopup();
    }

    // テキスト出力モーダル
    openTextExportModal() {
        this.currentExportFormat = 'markdown';
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.tab-btn[data-format="markdown"]').classList.add('active');
        this.updateTextExportContent();
        this.textExportModal.classList.remove('hidden');
    }

    closeTextExportModal() {
        this.textExportModal.classList.add('hidden');
    }

    updateTextExportContent() {
        let content = '';
        switch (this.currentExportFormat) {
            case 'markdown':
                content = this.generateMarkdown();
                break;
            case 'table':
                content = this.generateTable();
                break;
            case 'plain':
                content = this.generatePlainText();
                break;
        }
        this.textExportContent.value = content;
    }

    generateMarkdown(tasks = this.tasks, depth = 0) {
        let result = '';
        const indent = '  '.repeat(depth);

        tasks.forEach(task => {
            const checkbox = task.completed ? '[x]' : '[ ]';
            result += `${indent}- ${checkbox} ${task.title}\n`;

            if (task.memo && task.memo.trim()) {
                const memoLines = task.memo.split('\n');
                memoLines.forEach(line => {
                    result += `${indent}  > ${line}\n`;
                });
            }

            if (task.children && task.children.length > 0) {
                result += this.generateMarkdown(task.children, depth + 1);
            }
        });

        return result;
    }

    generateTable() {
        let result = '| 状態 | タスク | メモ |\n';
        result += '|:----:|--------|------|\n';

        const flattenTasks = (tasks, depth = 0) => {
            let rows = [];
            tasks.forEach(task => {
                const status = task.completed ? '✓' : '○';
                const indent = '　'.repeat(depth);
                const title = indent + task.title;
                const memo = (task.memo || '').replace(/\n/g, ' ').substring(0, 30);
                rows.push(`| ${status} | ${title} | ${memo}${memo.length >= 30 ? '...' : ''} |`);

                if (task.children && task.children.length > 0) {
                    rows = rows.concat(flattenTasks(task.children, depth + 1));
                }
            });
            return rows;
        };

        result += flattenTasks(this.tasks).join('\n');
        return result;
    }

    generatePlainText(tasks = this.tasks, depth = 0) {
        let result = '';
        const indent = '    '.repeat(depth);

        tasks.forEach(task => {
            const status = task.completed ? '[完了]' : '[未完]';
            result += `${indent}${status} ${task.title}\n`;

            if (task.memo && task.memo.trim()) {
                const memoLines = task.memo.split('\n');
                memoLines.forEach(line => {
                    result += `${indent}    メモ: ${line}\n`;
                });
            }

            if (task.children && task.children.length > 0) {
                result += this.generatePlainText(task.children, depth + 1);
            }
        });

        return result;
    }

    copyTextExport() {
        this.textExportContent.select();
        document.execCommand('copy');

        // コピー完了を通知
        const btn = document.getElementById('copyTextExport');
        const originalText = btn.textContent;
        btn.textContent = '✓ コピーしました';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }

    downloadTextExport() {
        const content = this.textExportContent.value;
        const ext = this.currentExportFormat === 'markdown' ? 'md' : 'txt';
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `todo-list-${new Date().toISOString().slice(0, 10)}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ドラッグ&ドロップ
    handleDragStart(e, taskId) {
        this.draggedItem = taskId;
        e.target.closest('.task-item').classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', taskId);
    }

    handleDragEnd(e) {
        document.querySelectorAll('.task-item').forEach(item => {
            item.classList.remove('dragging', 'drag-over');
        });
        this.draggedItem = null;
    }

    handleDragOver(e, targetId) {
        e.preventDefault();
        if (this.draggedItem === targetId) return;

        document.querySelectorAll('.task-item').forEach(item => {
            item.classList.remove('drag-over');
        });

        const targetElement = e.target.closest('.task-item');
        if (targetElement) {
            targetElement.classList.add('drag-over');
        }
    }

    handleDrop(e, targetId) {
        e.preventDefault();
        if (!this.draggedItem || this.draggedItem === targetId) return;

        // ドラッグ元のタスクを取得・削除
        const draggedTask = this.findTask(this.draggedItem);
        if (!draggedTask) return;

        // 自分の子孫にはドロップできない
        if (this.isDescendant(targetId, this.draggedItem)) return;

        const sourceResult = this.findParent(this.draggedItem);
        if (!sourceResult) return;

        const sourceIndex = sourceResult.list.findIndex(t => t.id === this.draggedItem);
        const [removed] = sourceResult.list.splice(sourceIndex, 1);

        // ドロップ先に挿入
        const targetResult = this.findParent(targetId);
        if (!targetResult) return;

        const targetIndex = targetResult.list.findIndex(t => t.id === targetId);
        targetResult.list.splice(targetIndex, 0, removed);

        this.saveToStorage();
        this.render();
    }

    isDescendant(targetId, parentId) {
        const parent = this.findTask(parentId);
        if (!parent || !parent.children) return false;

        for (const child of parent.children) {
            if (child.id === targetId) return true;
            if (this.isDescendant(targetId, child.id)) return true;
        }
        return false;
    }

    // レンダリング
    render() {
        if (this.tasks.length === 0) {
            this.taskList.innerHTML = `
                <div class="empty-state">
                    <p>タスクがありません</p>
                    <button class="btn btn-primary" onclick="app.openEditModal(null, null)">+ 最初のタスクを追加</button>
                </div>
            `;
            return;
        }

        this.taskList.innerHTML = this.renderTasks(this.tasks, 1);
        this.bindTaskEvents();
    }

    renderTasks(tasks, depth) {
        return tasks.map(task => this.renderTask(task, depth)).join('');
    }

    renderTask(task, depth) {
        const hasChildren = task.children && task.children.length > 0;
        const canAddChild = depth < this.maxDepth;

        const titleStyle = this.buildTitleStyle(task.style);
        const titleClass = `task-title size-${task.style.fontSize || 'medium'}`;

        const bandStyle = task.style.bandColor
            ? `border-left-color: ${task.style.bandColor};`
            : '';

        const hasMemo = task.memo && task.memo.trim().length > 0;

        return `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                <div class="task-content" style="${bandStyle}" draggable="true">
                    <span class="drag-handle">⋮⋮</span>
                    <button class="toggle-btn ${task.collapsed ? 'collapsed' : ''} ${!hasChildren ? 'hidden' : ''}" data-action="toggle">▼</button>
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-action="complete">
                    <span class="${titleClass}" style="${titleStyle}">${this.nl2br(this.linkify(this.escapeHtml(task.title)))}</span>
                    <button class="memo-btn ${hasMemo ? 'has-memo' : ''}" data-action="memo" title="メモ">📝</button>
                    <div class="task-actions">
                        <button class="action-btn" data-action="edit" title="編集">✎</button>
                        ${canAddChild ? `<button class="action-btn" data-action="addChild" title="子タスク追加">+</button>` : ''}
                        <button class="action-btn delete" data-action="delete" title="削除">×</button>
                    </div>
                </div>
                ${hasChildren ? `
                    <div class="children-container ${task.collapsed ? 'collapsed' : ''}">
                        ${this.renderTasks(task.children, depth + 1)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    buildTitleStyle(style) {
        const styles = [];

        if (style.textColor) {
            styles.push(`color: ${style.textColor}`);
        }
        if (style.bold) {
            styles.push('font-weight: bold');
        }
        if (style.italic) {
            styles.push('font-style: italic');
        }

        const decorations = [];
        if (style.underline) decorations.push('underline');
        if (style.strikethrough) decorations.push('line-through');
        if (decorations.length > 0) {
            styles.push(`text-decoration: ${decorations.join(' ')}`);
        }

        return styles.join('; ');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 改行を<br>に変換
    nl2br(text) {
        return text.replace(/\n/g, '<br>');
    }

    // URLを自動的にリンクに変換
    linkify(text) {
        const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g;
        return text.replace(urlPattern, '<a href="$1" class="task-link" target="_blank" rel="noopener noreferrer">$1</a>');
    }

    bindTaskEvents() {
        // ドラッグイベント
        document.querySelectorAll('.task-content[draggable="true"]').forEach(el => {
            const taskId = el.closest('.task-item').dataset.id;

            el.addEventListener('dragstart', (e) => this.handleDragStart(e, taskId));
            el.addEventListener('dragend', (e) => this.handleDragEnd(e));
            el.addEventListener('dragover', (e) => this.handleDragOver(e, taskId));
            el.addEventListener('drop', (e) => this.handleDrop(e, taskId));
        });

        // アクションボタン
        document.querySelectorAll('[data-action]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = el.closest('.task-item').dataset.id;
                const action = el.dataset.action;

                switch (action) {
                    case 'toggle':
                        this.toggleCollapse(taskId);
                        break;
                    case 'complete':
                        this.toggleComplete(taskId);
                        break;
                    case 'edit':
                        this.openEditModal(taskId, null);
                        break;
                    case 'addChild':
                        this.openEditModal(null, taskId);
                        break;
                    case 'memo':
                        this.openMemoPopup(taskId, el);
                        break;
                    case 'delete':
                        this.openConfirmDialog('このタスクを削除しますか？子タスクも削除されます。', () => {
                            this.deleteTask(taskId);
                        });
                        break;
                }
            });
        });
    }
}

// アプリケーション起動
const app = new TodoApp();
