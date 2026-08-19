import httpClient from './httpClient';
import type { TaskResponse } from '../dto';

export interface CreateTaskRequest {
    title: string;
    description?: string;
    difficulty?: number;
    status?: number;
    deadline: string;
    assignedToUserId?: string;
    createdByUserId?: string;
    parentTaskId?: number;
    files?: File[];
}

export interface UpdateTaskRequest {
    id: number;
    title: string;
    description: string;
    difficulty: number;
    status: number;
    deadline: string;
    assignedToUserId?: string;
    createdByUserId: string;
    parentTaskId?: number;
}

export const taskService = {
    async getAllTasks(): Promise<TaskResponse[]> {
        const response = await httpClient.get<TaskResponse[]>('/Task/GetAllTask');
        return response.data;
    },

    async getTaskById(id: number): Promise<TaskResponse> {
        const response = await httpClient.get<TaskResponse>(`/Task/GetTask/${id}`);
        return response.data;
    },

    async createTask(data: CreateTaskRequest, files?: File[]): Promise<TaskResponse> {
        const formData = new FormData();
        formData.append('Title', data.title || '');
        formData.append('Description', data.description || '');
        formData.append('Difficulty', (data.difficulty ?? 1).toString());
        formData.append('Status', (data.status ?? 0).toString());
        formData.append('Deadline', data.deadline);
        
        if (data.createdByUserId) {
            formData.append('CreatedByUserId', data.createdByUserId);
        }

        if (data.assignedToUserId) {
            formData.append('AssignedToUserId', data.assignedToUserId);
        }
        if (data.parentTaskId) {
            formData.append('ParentTaskId', data.parentTaskId.toString());
        }

        const allFiles = files && files.length > 0 ? files : data.files;
        if (allFiles && allFiles.length > 0) {
            allFiles.forEach((file) => {
                formData.append('files', file);
            });
        }

        const response = await httpClient.post<TaskResponse>('/Task/CreateTask', formData);
        return response.data;
    },

    async updateTask(data: UpdateTaskRequest): Promise<void> {
        await httpClient.put('/Task/UpdateTask', {
            Id: data.id,
            Title: data.title,
            Description: data.description,
            Difficulty: data.difficulty,
            Status: data.status,
            Deadline: data.deadline,
            AssignedToUserId: data.assignedToUserId,
            CreatedByUserId: data.createdByUserId,
            ParentTaskId: data.parentTaskId,
        });
    },

    async deleteTask(id: number): Promise<void> {
        await httpClient.delete(`/Task/DeleteTask/${id}`);
    },

    async addComment(taskId: number, comment: string): Promise<void> {
        await httpClient.post(`/Task/AddComment?taskId=${taskId}&comment=${encodeURIComponent(comment)}`);
    },

    async assignTask(taskId: number): Promise<void> {
        await httpClient.post(`/Task/AssignTask?taskId=${taskId}`);
    },

    async unassignTask(taskId: number): Promise<void> {
        await httpClient.post(`/Task/UnAssignTask?taskId=${taskId}`);
    },

    async acceptTask(taskId: number, _userId?: string): Promise<void> {
        await httpClient.post(`/Task/AcceptTask?taskId=${taskId}`);
    },

    async rejectTask(taskId: number, _userIdOrReason?: string, reason?: string): Promise<void> {
        const actualReason = reason || _userIdOrReason || 'İmtina edildi';
        await httpClient.post(`/Task/reject?taskId=${taskId}&reason=${encodeURIComponent(actualReason)}`);
    },

    async finishTask(taskId: number, _userId?: string): Promise<void> {
        await httpClient.post(`/Task/FinishTask?taskId=${taskId}`);
    },

    async reopenTask(taskId: number, userId?: string, reason?: string): Promise<void> {
        const uId = userId || '';
        const r = reason || 'Yenidən icra üçün göndərildi';
        await httpClient.post(`/Task/ReopenTask?taskId=${taskId}&userId=${encodeURIComponent(uId)}&reason=${encodeURIComponent(r)}`);
    },

    async returnForRevision(taskId: number, userId?: string, reason?: string): Promise<void> {
        return this.reopenTask(taskId, userId, reason);
    },

    async addFilesToTask(taskId: number, files: File[]): Promise<void> {
        const formData = new FormData();
        files.forEach((file) => {
            formData.append('files', file);
        });

        await httpClient.post(`/Task/AddFilesToTask/${taskId}`, formData);
    },
};

export default taskService;
