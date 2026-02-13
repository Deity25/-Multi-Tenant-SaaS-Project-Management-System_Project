import { useEffect, useMemo, useState } from "react";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  boards: { id: string; name: string }[];
};

type Task = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
};

type Member = {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
};

type ProjectMember = {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
};

type TenantSummary = {
  id: string;
  name: string;
  slug: string;
  members: number;
  projects: number;
  tasks: number;
  createdAt: string;
};

type AuthState = {
  token: string;
  tenantId: string;
  userId: string;
  role: string;
};

const API = import.meta.env.VITE_API_URL as string;

export function App() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [tenantSlug, setTenantSlug] = useState("rv5");
  const [tenantName, setTenantName] = useState("Rv5");
  const [name, setName] = useState("Gaurishankar Vhadle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [tenant, setTenant] = useState<TenantSummary | null>(null);
  const [newProjectName, setNewProjectName] = useState("Rv5 Roadmap");
  const [newTaskTitle, setNewTaskTitle] = useState("Define milestones");
  const [inviteName, setInviteName] = useState("New Teammate");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [invitePassword, setInvitePassword] = useState("password123");
  const [assignUserId, setAssignUserId] = useState("");
  const [assignProjectId, setAssignProjectId] = useState("");

  // Helper to generate headers safely for production
  const getHeaders = (token?: string): HeadersInit => {
    const t = token ?? auth?.token;
    return {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    };
  };

  async function signup() {
    const res = await fetch(`${API}/auth/signup`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ tenantName, tenantSlug, name, email, password }),
    });
    if (!res.ok) return alert("Signup failed");

    const data = await res.json();
    setAuth(data);
    await loadProjects(data.token);
    await loadMembers(data.token);
    await loadTenant(data.token);
  }

  async function login() {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email, password, tenantSlug }),
    });
    if (!res.ok) return alert("Login failed");

    const data = await res.json();
    setAuth(data);
    await loadProjects(data.token);
    await loadMembers(data.token);
    await loadTenant(data.token);
  }

  async function loadProjects(token?: string) {
    const res = await fetch(`${API}/projects`, { headers: getHeaders(token) });
    if (!res.ok) return;
    const data = await res.json();
    setProjects(data);
    setActiveProject(data[0] ?? null);
  }

  async function loadTasks(projectId: string, token?: string) {
    const res = await fetch(`${API}/projects/${projectId}/tasks`, { headers: getHeaders(token) });
    if (!res.ok) return;
    const data = await res.json();
    setTasks(data);
  }

  async function loadProjectMembers(projectId: string, token?: string) {
    const res = await fetch(`${API}/projects/${projectId}/members`, { headers: getHeaders(token) });
    if (!res.ok) return;
    const data = await res.json();
    setProjectMembers(data);
  }

  async function loadMembers(token?: string) {
    const res = await fetch(`${API}/admin/members`, { headers: getHeaders(token) });
    if (!res.ok) return;
    const data = await res.json();
    setMembers(data);
  }

  async function loadTenant(token?: string) {
    const res = await fetch(`${API}/admin/tenant`, { headers: getHeaders(token) });
    if (!res.ok) return;
    const data = await res.json();
    setTenant(data);
  }

  async function createProject() {
    if (!newProjectName) return;
    const res = await fetch(`${API}/projects`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ name: newProjectName, description: "High-level roadmap" }),
    });
    if (!res.ok) return;
    await loadProjects();
    await loadMembers();
    await loadTenant();
  }

  async function createTask() {
    if (!activeProject || activeProject.boards.length === 0) return;
    const boardId = activeProject.boards[0].id;
    const res = await fetch(`${API}/tasks`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ boardId, title: newTaskTitle }),
    });
    if (!res.ok) return;
    await loadTasks(activeProject.id);
  }

  async function moveTask(taskId: string, status: Task["status"]) {
    const res = await fetch(`${API}/tasks/${taskId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function deleteTask(taskId: string) {
    const res = await fetch(`${API}/tasks/${taskId}`, { method: "DELETE", headers: getHeaders() });
    if (!res.ok) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  async function deleteProject(projectId: string) {
    const res = await fetch(`${API}/projects/${projectId}`, { method: "DELETE", headers: getHeaders() });
    if (!res.ok) return;
    const next = projects.filter((p) => p.id !== projectId);
    setProjects(next);
    const newActive = next[0] ?? null;
    setActiveProject(newActive);
    if (newActive) await loadTasks(newActive.id);
    else setTasks([]);
  }

  async function inviteMember() {
    const res = await fetch(`${API}/admin/invite`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ name: inviteName, email: inviteEmail, role: inviteRole, password: invitePassword }),
    });
    if (!res.ok) return alert("Invite failed");
    await loadMembers();
    await loadTenant();
  }

  async function assignToProject() {
    if (!assignProjectId || !assignUserId) return;
    const res = await fetch(`${API}/projects/${assignProjectId}/members`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ userId: assignUserId, role: "MEMBER" }),
    });
    if (!res.ok) return alert("Assign failed");
    setAssignUserId("");
    await loadProjectMembers(assignProjectId);
  }

  async function removeFromProject(userId: string) {
    if (!activeProject) return;
    const res = await fetch(`${API}/projects/${activeProject.id}/members/${userId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) return;
    await loadProjectMembers(activeProject.id);
  }

  useEffect(() => {
    if (auth && activeProject) {
      void loadTasks(activeProject.id, auth.token);
      void loadProjectMembers(activeProject.id, auth.token);
    }
  }, [auth, activeProject?.id]);

  const doneCount = tasks.filter((t) => t.status === "DONE").length;
  const canAdmin = auth?.role === "OWNER" || auth?.role === "ADMIN";
  
  return (
    <div className="app">
      <header className="hero">
        <div className="hero-text">
          <p className="eyebrow">Rv5</p>
          <h1>Gaurishankar Vhadle Workspace</h1>
          <p className="sub">Use it or Drag It.</p>
        </div>
        <div className="hero-card">
          {!auth ? (
            <div className="auth">
              <div className="toggle">
                <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Sign up</button>
                <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Log in</button>
              </div>
              {mode === "signup" ? (
                <>
                  <input value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="Workspace name" />
                  <input value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} placeholder="Workspace slug" />
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Owner name" />
                </>
              ) : null}
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
              <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
              <button className="primary" onClick={mode === "signup" ? signup : login}>
                {mode === "signup" ? "Create workspace" : "Enter workspace"}
              </button>
            </div>
          ) : (
            <div className="auth">
              <p className="muted">Signed in as {email}</p>
              <div className="inline">
                <button className="secondary" onClick={() => loadProjects()}>
                Refresh projects
                </button>
                <button
                  className="danger"
                  onClick={() => {
                    setAuth(null);
                    setProjects([]);
                    setActiveProject(null);
                    setTasks([]);
                    setMembers([]);
                    setProjectMembers([]);
                    setTenant(null);
                  }}
                >
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <section className="dashboard">
        <div className="panel">
          <div className="panel-header">
            <h2>Projects</h2>
            {tenant ? <span className="badge">Workspace: {tenant.name}</span> : null}
            <div className="inline">
              <input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="New project name"
              />
              <button onClick={createProject}>Add</button>
            </div>
          </div>
          <div className="list">
            {projects.map((project) => (
              <div
                key={project.id}
                className={activeProject?.id === project.id ? "list-item active" : "list-item"}
              >
                <button className="link" onClick={() => setActiveProject(project)}>
                  <span>{project.name}</span>
                  <small>{project.boards.length} boards</small>
                </button>
                <button className="danger" onClick={() => deleteProject(project.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Backlog</h2>
            <span className="badge">
              Done {doneCount}/{tasks.length}
            </span>
            <div className="inline">
              <input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="New task"
              />
              <button onClick={createTask}>Create</button>
            </div>
          </div>
          <div className="kanban">
            {tasks.length === 0 ? (
              <p className="muted">Create a task to see it here.</p>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className={`card status-${task.status.toLowerCase()}`}>
                  <div>
                    <h3>{task.title}</h3>
                    <p className="muted">Status: {task.status.replace("_", " ")}</p>
                  </div>
                  <div className="actions">
                    <button onClick={() => moveTask(task.id, "TODO")}>Todo</button>
                    <button onClick={() => moveTask(task.id, "IN_PROGRESS")}>Doing</button>
                    <button onClick={() => moveTask(task.id, "DONE")}>Done</button>
                    <button className="danger" onClick={() => deleteTask(task.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Project Members</h2>
          </div>
          {!activeProject ? (
            <p className="muted">Select a project to manage members.</p>
          ) : (
            <>
              <p className="muted">
                Working on: <strong>{activeProject.name}</strong> (ID: {activeProject.id})
              </p>
              {projectMembers.length === 0 ? (
                <p className="muted">No members assigned yet.</p>
              ) : (
                <div className="list">
                  {projectMembers.map((m) => (
                    <div key={m.id} className="list-item">
                      <div>
                        <strong>{m.user.name}</strong>
                        <small>{m.user.email}</small>
                      </div>
                      <div className="inline">
                        <span className="badge">{m.role}</span>
                        {canAdmin ? (
                          <button className="danger" onClick={() => removeFromProject(m.user.id)}>
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {canAdmin ? (
                <div className="invite">
                  <h3>Assign Employee To Project</h3>
                  <div className="inline">
                    <select value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)}>
                      <option value="">Select employee</option>
                      {members.map((m) => (
                        <option key={m.user.id} value={m.user.id}>
                          {m.user.name} ({m.user.email})
                        </option>
                      ))}
                    </select>
                    <select value={assignProjectId} onChange={(e) => setAssignProjectId(e.target.value)}>
                      <option value="">Select project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <button onClick={assignToProject}>Assign</button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Team</h2>
          </div>
          {tenant ? (
            <div className="summary">
              <div>
                <strong>{tenant.name}</strong>
                <small>Slug: {tenant.slug}</small>
              </div>
              <span className="badge">{tenant.members} members</span>
              <span className="badge">{tenant.projects} projects</span>
              <span className="badge">{tenant.tasks} tasks</span>
            </div>
          ) : null}
          {members.length === 0 ? (
            <p className="muted">No members loaded.</p>
          ) : (
            <div className="list">
              {members.map((m) => (
                <div key={m.id} className="list-item">
                  <div>
                    <strong>{m.user.name}</strong>
                    <small>{m.user.email}</small>
                  </div>
                  <span className="badge">{m.role}</span>
                </div>
              ))}
            </div>
          )}
          {canAdmin ? (
            <div className="invite">
              <h3>Add Team Member</h3>
              <div className="inline">
                <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Name" />
                <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Email" />
                <input
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="Temp password"
                />
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                  <option value="VIEWER">Viewer</option>
                </select>
                <button onClick={inviteMember}>Invite</button>
              </div>
              <p className="muted">Admins and owners can see all team members and projects.</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
