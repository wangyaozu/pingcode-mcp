import { z } from 'zod';
import { workItemService } from '../services/workItemService.js';
import type { WorkItemInfo, WorkItemInfoV2 } from '../services/workItemService.js';
import { logger } from '../utils/logger.js';
import { createToolDefinition } from './schemaUtils.js';

// ============ Schema 定义 ============

export const GetWorkItemInputSchema = z.object({
  id: z.string().optional(),
  identifier: z.string().optional(),
}).refine(
  (data) => data.id || data.identifier,
  { message: '必须提供 id 或 identifier 参数' }
);

export type GetWorkItemInput = z.infer<typeof GetWorkItemInputSchema>;

// ============ 输出类型 (v1) ============

export interface GetWorkItemOutput {
  work_item: {
    id: string;
    identifier: string;
    title: string;
    description?: string;
    state?: string;
    type?: string;
    assignee?: {
      id: string;
      name: string;
      display_name: string;
    };
    project: {
      id: string | null;
      identifier: string | null;
      name: string;
      type?: string;
    };
  };
}

export interface GetWorkItemError {
  error: string;
  code: 'NOT_FOUND' | 'INTERNAL_ERROR';
}

export type GetWorkItemResult = GetWorkItemOutput | GetWorkItemError;

// ============ 输出类型 (v2 - 包含图片处理) ============

export interface GetWorkItemOutputV2 {
  work_item: {
    id: string;
    identifier: string;
    title: string;
    description?: WorkItemInfoV2['description'];
    state?: string;
    type?: string;
    assignee?: {
      id: string;
      name: string;
      display_name: string;
    };
    project: {
      id: string | null;
      identifier: string | null;
      name: string;
      type?: string;
    };
    properties?: WorkItemInfoV2['properties'];
    images: WorkItemInfoV2['images'];
  };
}

export type GetWorkItemResultV2 = GetWorkItemOutputV2 | GetWorkItemError;

// ============ Tool 实现 (v1) ============

export async function getWorkItemV1(input: GetWorkItemInput, signal?: AbortSignal): Promise<GetWorkItemResult> {
  logger.info({ input }, 'get_work_item_v1 called');

  try {
    let workItem: WorkItemInfo | null = null;

    if (input.identifier) {
      workItem = await workItemService.getWorkItemByIdentifier(input.identifier, signal);
    } else if (input.id) {
      workItem = await workItemService.getWorkItem(input.id, signal);
    }

    const queryParam = input.identifier || input.id;

    if (!workItem) {
      return {
        error: `Work item not found: ${queryParam}`,
        code: 'NOT_FOUND',
      };
    }

    return {
      work_item: {
        id: workItem.id,
        identifier: workItem.identifier,
        title: workItem.title,
        description: workItem.description,
        state: workItem.state,
        type: workItem.type,
        assignee: workItem.assignee ? {
          id: workItem.assignee.id,
          name: workItem.assignee.name,
          display_name: workItem.assignee.display_name,
        } : undefined,
        project: {
          id: workItem.project.id,
          identifier: workItem.project.identifier,
          name: workItem.project.name,
          type: workItem.project.type,
        },
      },
    };
  } catch (error) {
    logger.error({ error, input }, 'get_work_item_v1 failed');
    return {
      error: `Internal error: ${(error as Error).message}`,
      code: 'INTERNAL_ERROR',
    };
  }
}

// ============ Tool 实现 (v2 - 包含图片处理) ============

export async function getWorkItemV2(input: GetWorkItemInput, signal?: AbortSignal): Promise<GetWorkItemResultV2> {
  logger.info({ input }, 'get_work_item_v2 called');

  try {
    let workItem: WorkItemInfoV2 | null = null;

    if (input.identifier) {
      workItem = await workItemService.getWorkItemByIdentifierV2(input.identifier, signal);
    } else if (input.id) {
      workItem = await workItemService.getWorkItemV2(input.id, signal);
    }

    const queryParam = input.identifier || input.id;

    if (!workItem) {
      return {
        error: `Work item not found: ${queryParam}`,
        code: 'NOT_FOUND',
      };
    }

    return {
      work_item: {
        id: workItem.id,
        identifier: workItem.identifier,
        title: workItem.title,
        description: workItem.description,
        state: workItem.state,
        type: workItem.type,
        assignee: workItem.assignee ? {
          id: workItem.assignee.id,
          name: workItem.assignee.name,
          display_name: workItem.assignee.display_name,
        } : undefined,
        project: {
          id: workItem.project.id,
          identifier: workItem.project.identifier,
          name: workItem.project.name,
          type: workItem.project.type,
        },
        properties: workItem.properties,
        images: workItem.images,
      },
    };
  } catch (error) {
    logger.error({ error, input }, 'get_work_item_v2 failed');
    return {
      error: `Internal error: ${(error as Error).message}`,
      code: 'INTERNAL_ERROR',
    };
  }
}

// 兼容旧版本的导出
export const getWorkItem = getWorkItemV1;

// ============ MCP Tool 定义 ============

export const getWorkItemToolDefinition = {
  name: 'get_work_item',
  ...createToolDefinition(
    `获取单个工作项的详情。

参数：
- id: 工作项 ID（MongoDB ID）
- identifier: 工作项编号（如 "SCR-5"）
- 注：id 和 identifier 二选一

返回：
- work_item: 工作项详情（含项目信息）`,
    GetWorkItemInputSchema,
  ),
};

// v2 版本描述
export const getWorkItemV2ToolDescription = `获取单个工作项的详情（包含图片处理）。

参数：
- id: 工作项 ID（MongoDB ID）
- identifier: 工作项编号（如 "SCR-5"）
- 注：id 和 identifier 二选一

返回：
- work_item: 工作项详情
  - description: 处理后的描述（含图片信息）
  - properties: 处理后的自定义字段（HTML 字段会提取图片）
  - images: 所有图片的汇总列表（含 base64 数据）

特性：
- 自动从 HTML 内容中提取图片 URL
- 下载图片并转为 Base64 格式
- 支持直接在 Claude Code 中显示图片`;

