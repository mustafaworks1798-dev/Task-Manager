let projects = JSON.parse(localStorage.getItem('tm_projects')) || [];
let activeProjectId = JSON.parse(localStorage.getItem('tm_active')) || null;
let zIndexCounter = 1;

const projectModal = document.getElementById('projectModal');
const newProjectName = document.getElementById('newProjectName');

if (projects.length === 0) {
    projects.push({ id: Date.now(), name: 'My Project', tasks: [] });
    activeProjectId = projects[0].id;
    save();
}

function save() {
    localStorage.setItem('tm_projects', JSON.stringify(projects));
    localStorage.setItem('tm_active', JSON.stringify(activeProjectId));
}

function getTotalPoints() {
    return projects.reduce((sum, project) => {
        return sum + project.tasks.reduce((projectSum, task) => {
            return projectSum + (parseInt(task.points, 10) || 0);
        }, 0);
    }, 0);
}

function updateSummary() {
    document.getElementById('totalProjects').textContent = projects.length;
    document.getElementById('totalPoints').textContent = getTotalPoints();
}

function showProjectModal() {
    projectModal.classList.add('show');
    newProjectName.value = '';
    setTimeout(() => newProjectName.focus(), 50);
}

function hideProjectModal() {
    projectModal.classList.remove('show');
}

function getActiveProject() {
    return projects.find(p => p.id === activeProjectId) || projects[0];
}

function renderSidebar() {
    const list = document.getElementById('projectList');
    list.innerHTML = '';

    projects.forEach(p => {
        const li = document.createElement('li');
        li.className = 'project-item' + (p.id === activeProjectId ? ' active' : '');
        li.innerHTML = `
            <span>${escapeHTML(p.name)}</span>
            <button class="project-delete" data-id="${p.id}"><i class="fa-solid fa-xmark"></i></button>
        `;
        li.addEventListener('click', (e) => {
            if (!e.target.closest('.project-delete')) {
                activeProjectId = p.id;
                save();
                renderSidebar();
                renderTasks();
            }
        });
        list.appendChild(li);
    });

    document.querySelectorAll('.project-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            if (projects.length <= 1) return;
            projects = projects.filter(p => p.id !== id);
            if (activeProjectId === id) activeProjectId = projects[0].id;
            save();
            renderSidebar();
            renderTasks();
        });
    });
}

document.getElementById('btnNewProject').addEventListener('click', showProjectModal);

document.getElementById('btnReloadPoints').addEventListener('click', () => {
    projects = JSON.parse(localStorage.getItem('tm_projects')) || projects;
    activeProjectId = JSON.parse(localStorage.getItem('tm_active')) || activeProjectId;
    if (projects.length === 0) {
        projects.push({ id: Date.now(), name: 'My Project', tasks: [] });
        activeProjectId = projects[0].id;
    }
    save();
    renderSidebar();
    renderTasks();
});

document.getElementById('modalCancel').addEventListener('click', hideProjectModal);

document.getElementById('modalCreate').addEventListener('click', () => {
    const name = newProjectName.value.trim();
    if (!name) return;
    const project = { id: Date.now(), name, tasks: [] };
    projects.push(project);
    activeProjectId = project.id;
    save();
    renderSidebar();
    renderTasks();
    hideProjectModal();
});

projectModal.addEventListener('click', (e) => {
    if (e.target === projectModal) hideProjectModal();
});

function renderTasks() {
    const canvas = document.getElementById('canvas');
    const placeholder = document.getElementById('placeholder');
    canvas.querySelectorAll('.task-card').forEach(c => c.remove());

    const project = getActiveProject();
    if (!project || project.tasks.length === 0) {
        placeholder.style.display = 'block';
    } else {
        placeholder.style.display = 'none';
    }

    project.tasks.forEach(task => {
        const card = createTaskCard(task);
        canvas.appendChild(card);
    });
    updateSummary();
}

function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card' + (task.completed ? ' completed' : '');
    card.style.left = task.x + 'px';
    card.style.top = task.y + 'px';
    card.style.zIndex = ++zIndexCounter;
    card.dataset.id = task.id;

    card.innerHTML = `
        <div class="task-header">
            <span class="task-title">${escapeHTML(task.title)}</span>
            ${task.points ? `<span class="task-points">${task.points} pts</span>` : ''}
            <div class="task-actions">
                <button class="btn-complete" title="Complete">✓</button>
                <button class="btn-expand ${task.expanded ? 'open' : ''}" title="Subtasks">⌄</button>
            </div>
        </div>
        <div class="subtasks ${task.expanded ? 'open' : ''}">
            ${(task.subtasks || []).map(st => `
                <div class="subtask-item ${st.completed ? 'completed' : ''}" data-stid="${st.id}">
                    <input type="checkbox" ${st.completed ? 'checked' : ''}>
                    <span>${escapeHTML(st.title)}</span>
                </div>
            `).join('')}
            <div class="subtask-add">
                <input type="text" placeholder="New subtask...">
                <button>Add</button>
            </div>
        </div>
    `;

    let dragging = false, offsetX, offsetY;
    card.addEventListener('mousedown', (e) => {
        if (e.target.closest('button, input, .subtask-add')) return;
        dragging = true;
        offsetX = e.clientX - card.offsetLeft;
        offsetY = e.clientY - card.offsetTop;
        card.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const canvas = document.getElementById('canvas');
        const rect = canvas.getBoundingClientRect();
        card.style.left = (e.clientX - rect.left - offsetX) + 'px';
        card.style.top = (e.clientY - rect.top - offsetY) + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (dragging) {
            const taskObj = getActiveProject().tasks.find(t => t.id == card.dataset.id);
            if (taskObj) {
                taskObj.x = parseInt(card.style.left);
                taskObj.y = parseInt(card.style.top);
                save();
            }
            dragging = false;
            card.style.cursor = 'grab';
        }
    });

    card.querySelector('.btn-complete').addEventListener('click', () => {
        const taskObj = getActiveProject().tasks.find(t => t.id == task.id);
        if (!taskObj) return;
        taskObj.completed = !taskObj.completed;
        save();
        renderTasks();

        if (taskObj.completed) {
            setTimeout(() => {
                const proj = getActiveProject();
                proj.tasks = proj.tasks.filter(t => t.id !== task.id);
                save();
                renderTasks();
            }, 60000);
        }
    });

    card.querySelector('.btn-expand').addEventListener('click', () => {
        const taskObj = getActiveProject().tasks.find(t => t.id == task.id);
        if (!taskObj) return;
        taskObj.expanded = !taskObj.expanded;
        save();
        renderTasks();
    });

    card.querySelectorAll('.subtask-item input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
            const taskObj = getActiveProject().tasks.find(t => t.id == task.id);
            if (!taskObj) return;
            const stId = parseInt(cb.closest('.subtask-item').dataset.stid);
            const subtask = taskObj.subtasks.find(s => s.id === stId);
            if (subtask) {
                subtask.completed = cb.checked;
                save();
                renderTasks();
            }
        });
    });

    card.querySelector('.subtask-add button').addEventListener('click', () => {
        const input = card.querySelector('.subtask-add input');
        const title = input.value.trim();
        if (!title) return;
        const taskObj = getActiveProject().tasks.find(t => t.id == task.id);
        if (!taskObj) return;
        if (!taskObj.subtasks) taskObj.subtasks = [];
        taskObj.subtasks.push({ id: Date.now(), title, completed: false });
        save();
        renderTasks();
    });

    card.addEventListener('click', (e) => {
        if (!e.target.closest('button, input, .subtask-add')) {
            card.style.zIndex = ++zIndexCounter;
        }
    });

    return card;
}

const contextMenu = document.getElementById('contextMenu');
const ctxTitle = document.getElementById('ctxTitle');
const ctxPoints = document.getElementById('ctxPoints');
let ctxX = 0, ctxY = 0;

function showContextMenu(x, y) {
    ctxX = x;
    ctxY = y;
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.classList.add('show');
    ctxTitle.value = '';
    ctxPoints.value = '';
    setTimeout(() => ctxTitle.focus(), 50);
}

function hideContextMenu() {
    contextMenu.classList.remove('show');
}

document.getElementById('canvas').addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const rect = document.getElementById('canvas').getBoundingClientRect();
    showContextMenu(e.clientX, e.clientY);
});

document.getElementById('canvas').addEventListener('click', (e) => {
    if (e.target === document.getElementById('canvas') || e.target === document.getElementById('placeholder')) {
        hideContextMenu();
    }
});

let longPressTimer;
document.getElementById('canvas').addEventListener('touchstart', (e) => {
    if (e.target.closest('.task-card, button, input')) return;
    const touch = e.touches[0];
    longPressTimer = setTimeout(() => {
        showContextMenu(touch.clientX, touch.clientY);
    }, 500);
});

document.getElementById('canvas').addEventListener('touchend', () => clearTimeout(longPressTimer));
document.getElementById('canvas').addEventListener('touchmove', () => clearTimeout(longPressTimer));

document.getElementById('ctxCancel').addEventListener('click', hideContextMenu);

document.getElementById('ctxCreate').addEventListener('click', () => {
    const title = ctxTitle.value.trim();
    if (!title) return;

    const canvas = document.getElementById('canvas');
    const rect = canvas.getBoundingClientRect();
    const x = ctxX - rect.left - 100;
    const y = ctxY - rect.top - 20;

    const project = getActiveProject();
    project.tasks.push({
        id: Date.now(),
        title,
        points: parseInt(ctxPoints.value) || 0,
        x: Math.max(0, x),
        y: Math.max(0, y),
        completed: false,
        expanded: false,
        subtasks: []
    });

    save();
    renderTasks();
    hideContextMenu();
});

document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target) && e.target !== document.getElementById('canvas')) {
        hideContextMenu();
    }
});

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

renderSidebar();
renderTasks();
