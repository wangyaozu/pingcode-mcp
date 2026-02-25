import {
  getWorkItem,
  getWorkItemByIdentifier,
  getWorkItemsBatch,
  getWorkItemsFromWorkloads,
} from '../api/endpoints/workItems.js';
import type { PingCodeWorkItem, PingCodeWorkload, ImageInfo, ProcessedPropertyField } from '../api/types.js';
import { sanitizeTitle, sanitizeName } from '../utils/sanitize.js';
import {
  processHtmlField,
  processPropertiesFields,
  collectAllImages,
  isHtmlContent,
} from '../utils/imageUtils.js';

export interface WorkItemInfo {
  id: string;
  identifier: string;
  title: string;
  description?: string;  // HTML 格式的详细描述
  project: {
    id: string | null;
    identifier: string | null;
    name: string;
    type?: string;
  };
  state?: string;
  type?: string;
  assignee?: {
    id: string;
    name: string;
    display_name: string;
  };
}

// v2 版本：包含处理后的图片信息
export interface WorkItemInfoV2 {
  id: string;
  identifier: string;
  title: string;
  description?: ProcessedPropertyField;  // 处理后的描述（含图片）
  project: {
    id: string | null;
    identifier: string | null;
    name: string;
    type?: string;
  };
  state?: string;
  type?: string;
  assignee?: {
    id: string;
    name: string;
    display_name: string;
  };
  properties?: Record<string, ProcessedPropertyField | unknown>;  // 处理后的自定义字段
  images: ImageInfo[];  // 所有图片的汇总列表
}

export interface ProjectInfo {
  id: string | null;
  identifier: string | null;
  name: string;
  type?: string;
}

/**
 * 工作项服务 - 封装工作项相关业务逻辑
 */
export class WorkItemService {
  /**
   * 获取工作项详情
   */
  async getWorkItem(workItemId: string, signal?: AbortSignal): Promise<WorkItemInfo | null> {
    const item = await getWorkItem(workItemId, signal);
    return item ? this.toWorkItemInfo(item) : null;
  }

  /**
   * 通过 identifier 获取工作项详情
   */
  async getWorkItemByIdentifier(identifier: string, signal?: AbortSignal): Promise<WorkItemInfo | null> {
    const item = await getWorkItemByIdentifier(identifier, signal);
    return item ? this.toWorkItemInfo(item) : null;
  }

  /**
   * 获取工作项详情 (v2 - 包含图片处理)
   */
  async getWorkItemV2(workItemId: string, signal?: AbortSignal): Promise<WorkItemInfoV2 | null> {
    const item = await getWorkItem(workItemId, signal, true);
    return item ? await this.toWorkItemInfoV2(item) : null;
  }

  /**
   * 通过 identifier 获取工作项详情 (v2 - 包含图片处理)
   */
  async getWorkItemByIdentifierV2(identifier: string, signal?: AbortSignal): Promise<WorkItemInfoV2 | null> {
    const item = await getWorkItemByIdentifier(identifier, signal, true);
    return item ? await this.toWorkItemInfoV2(item) : null;
  }

  /**
   * 批量获取工作项
   */
  async getWorkItems(workItemIds: string[]): Promise<{
    items: Map<string, WorkItemInfo>;
    missingCount: number;
  }> {
    const { items, missingCount } = await getWorkItemsBatch(workItemIds);

    const result = new Map<string, WorkItemInfo>();
    for (const [id, item] of items) {
      result.set(id, this.toWorkItemInfo(item));
    }

    return { items: result, missingCount };
  }

  /**
   * 从工时记录中提取并获取所有关联的工作项
   */
  async enrichWorkloadsWithWorkItems(
    workloads: PingCodeWorkload[],
    signal?: AbortSignal
  ): Promise<{
    workItems: Map<string, WorkItemInfo>;
    missingCount: number;
  }> {
    const { items, missingCount } = await getWorkItemsFromWorkloads(workloads, signal);

    const result = new Map<string, WorkItemInfo>();
    for (const [id, item] of items) {
      result.set(id, this.toWorkItemInfo(item));
    }

    return { workItems: result, missingCount };
  }

  /**
   * 从工作项中提取项目信息
   */
  extractProjects(workItems: Map<string, WorkItemInfo>): Map<string, ProjectInfo> {
    const projects = new Map<string, ProjectInfo>();

    for (const item of workItems.values()) {
      if (item.project && item.project.id && !projects.has(item.project.id)) {
        projects.set(item.project.id, item.project);
      }
    }

    return projects;
  }

  /**
   * 转换为 WorkItemInfo 格式
   */
  private toWorkItemInfo(item: PingCodeWorkItem): WorkItemInfo {
    return {
      id: item.id,
      identifier: item.identifier,
      title: sanitizeTitle(item.title) ?? '',
      description: item.description,
      project: {
        id: item.project.id,
        identifier: item.project.identifier,
        name: sanitizeName(item.project.name) ?? '',
        type: item.project.type,
      },
      state: item.state,
      type: item.type,
      assignee: item.assignee ? {
        id: item.assignee.id,
        name: sanitizeName(item.assignee.name) ?? '',
        display_name: sanitizeName(item.assignee.display_name) ?? '',
      } : undefined,
    };
  }

  /**
   * 转换为 WorkItemInfoV2 格式（包含图片处理）
   */
  private async toWorkItemInfoV2(item: PingCodeWorkItem): Promise<WorkItemInfoV2> {
    const token = item.public_image_token;

    // 处理 description
    let description: ProcessedPropertyField | undefined;
    if (item.description && isHtmlContent(item.description)) {
      description = await processHtmlField(item.description, token);
    } else if (item.description) {
      description = { raw: item.description, text: item.description, images: [] };
    }

    // 处理 properties
    const processedProperties = await processPropertiesFields(item.properties, token);

    // 收集所有图片
    const images: ImageInfo[] = [];
    if (description) {
      images.push(...description.images);
    }
    images.push(...collectAllImages(processedProperties));

    return {
      id: item.id,
      identifier: item.identifier,
      title: sanitizeTitle(item.title) ?? '',
      description,
      project: {
        id: item.project.id,
        identifier: item.project.identifier,
        name: sanitizeName(item.project.name) ?? '',
        type: item.project.type,
      },
      state: item.state,
      type: item.type,
      assignee: item.assignee ? {
        id: item.assignee.id,
        name: sanitizeName(item.assignee.name) ?? '',
        display_name: sanitizeName(item.assignee.display_name) ?? '',
      } : undefined,
      properties: Object.keys(processedProperties).length > 0 ? processedProperties : undefined,
      images,
    };
  }
}

// Singleton instance
export const workItemService = new WorkItemService();
