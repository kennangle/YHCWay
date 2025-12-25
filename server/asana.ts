// Asana integration using Replit connector
// Reference: connection:conn_asana_01KCPWFVXGEV4SZ7YTV3KG19HB

import * as Asana from 'asana';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=asana',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Asana not connected');
  }
  return accessToken;
}

async function getAsanaApiInstances() {
  const accessToken = await getAccessToken();
  
  const client = Asana.ApiClient.instance;
  const token = client.authentications['token'];
  token.accessToken = accessToken;

  return {
    tasksApi: new Asana.TasksApi(),
    projectsApi: new Asana.ProjectsApi(),
    usersApi: new Asana.UsersApi(),
    workspacesApi: new Asana.WorkspacesApi()
  };
}

export async function isAsanaConnected(): Promise<boolean> {
  try {
    const { usersApi } = await getAsanaApiInstances();
    await usersApi.getUser('me', {});
    return true;
  } catch (error) {
    return false;
  }
}

export interface AsanaTask {
  id: string;
  name: string;
  completed: boolean;
  dueOn: string | null;
  dueAt: string | null;
  assignee: { name: string; email?: string } | null;
  projectName: string | null;
  notes: string;
  permalink: string;
  createdAt: string;
  modifiedAt: string;
}

export interface AsanaProject {
  id: string;
  name: string;
  color: string | null;
  notes: string;
  permalink: string;
}

export async function getMyTasks(limit: number = 20): Promise<AsanaTask[]> {
  try {
    const { tasksApi, usersApi, workspacesApi } = await getAsanaApiInstances();
    
    const me = await usersApi.getUser('me', {});
    const workspaces = await workspacesApi.getWorkspaces({});
    
    if (!workspaces.data || workspaces.data.length === 0) {
      return [];
    }

    const workspaceGid = workspaces.data[0].gid;
    
    const tasksResponse = await tasksApi.getTasks({
      assignee: me.data?.gid,
      workspace: workspaceGid,
      completed_since: 'now',
      opt_fields: 'name,completed,due_on,due_at,assignee.name,assignee.email,projects.name,notes,permalink_url,created_at,modified_at',
      limit: limit
    });

    const tasks: AsanaTask[] = (tasksResponse.data || []).map((task: any) => ({
      id: task.gid,
      name: task.name,
      completed: task.completed || false,
      dueOn: task.due_on || null,
      dueAt: task.due_at || null,
      assignee: task.assignee ? { name: task.assignee.name, email: task.assignee.email } : null,
      projectName: task.projects?.[0]?.name || null,
      notes: task.notes || '',
      permalink: task.permalink_url || '',
      createdAt: task.created_at || '',
      modifiedAt: task.modified_at || ''
    }));

    return tasks;
  } catch (error: any) {
    console.error('Error fetching Asana tasks:', error?.message || error);
    throw error;
  }
}

export async function getProjects(limit: number = 20): Promise<AsanaProject[]> {
  try {
    const { projectsApi, workspacesApi } = await getAsanaApiInstances();
    
    const workspaces = await workspacesApi.getWorkspaces({});
    
    if (!workspaces.data || workspaces.data.length === 0) {
      return [];
    }

    const workspaceGid = workspaces.data[0].gid;
    
    const projectsResponse = await projectsApi.getProjects({
      workspace: workspaceGid,
      opt_fields: 'name,color,notes,permalink_url',
      limit: limit
    });

    const projects: AsanaProject[] = (projectsResponse.data || []).map((project: any) => ({
      id: project.gid,
      name: project.name,
      color: project.color || null,
      notes: project.notes || '',
      permalink: project.permalink_url || ''
    }));

    return projects;
  } catch (error: any) {
    console.error('Error fetching Asana projects:', error?.message || error);
    throw error;
  }
}

export async function getUpcomingTasks(days: number = 7, limit: number = 20): Promise<AsanaTask[]> {
  try {
    const tasks = await getMyTasks(limit * 2);
    
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);
    
    const upcomingTasks = tasks.filter(task => {
      if (!task.dueOn && !task.dueAt) return true;
      const dueDate = new Date(task.dueAt || task.dueOn || '');
      return dueDate <= futureDate;
    }).slice(0, limit);

    return upcomingTasks;
  } catch (error) {
    console.error('Error fetching upcoming Asana tasks:', error);
    return [];
  }
}
