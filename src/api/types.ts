// PingCode API Response Types

export interface PingCodeUser {
  id: string;
  name: string;
  display_name: string;
  email?: string;
  department?: string;
  job?: string;
}

export interface PingCodeWorkloadWorkItem {
  id: string;
  identifier: string;
  title: string;
  type?: string;
}

/**
 * /v1/workloads API 原始响应格式
 */
export interface RawPingCodeWorkload {
  id: string;
  principal_type: 'work_item' | 'idea' | 'test_case';
  principal?: {
    id: string;
    identifier: string;
    title: string;
    type?: string;
  };
  type?: {
    id: string;
    name: string;
  };
  duration: number;
  review_state?: string;
  description?: string;
  report_at: number;
  report_by: {
    id: string;
    name: string;
    display_name: string;
  };
  created_at: number;
  created_by?: {
    id: string;
    name: string;
    display_name: string;
  };
}

/**
 * 标准化后的工时记录
 */
export interface PingCodeWorkload {
  id: string;
  project?: PingCodeProject;
  work_item?: PingCodeWorkloadWorkItem;
  duration: number;       // hours
  description?: string;
  report_at: number;      // Unix timestamp (seconds)
  report_by: {
    id: string;
    name: string;
    display_name: string;
  };
  type?: string;
  created_at: number;
}

export interface PingCodeProject {
  id: string;
  identifier: string;
  name: string;
  type?: string;
}

// 图片信息（包含 Base64 数据）
export interface ImageInfo {
  url: string;           // 原始图片 URL
  originUrl?: string;    // 原始 URL
  alt?: string;          // 替代文本
  size?: number;         // 文件大小（字节）
  mimeType?: string;     // MIME 类型 (image/png, image/jpeg 等)
  base64?: string;       // Base64 编码的图片数据（Claude Code 可直接识别）
  dataUri?: string;      // 完整的 data URI (data:image/png;base64,...)
}

// properties 中的 HTML 字段处理后结构
export interface ProcessedPropertyField {
  raw: string;                    // 原始 HTML
  text?: string;                  // 纯文本内容
  images: ImageInfo[];            // 提取的图片列表（含 base64）
}

// 工作项 properties 类型（动态字段）
export interface PingCodeWorkItemProperties {
  [key: string]: unknown;  // 其他自定义字段保持原样
}

export interface PingCodeWorkItem {
  id: string;
  identifier: string;
  title: string;
  description?: string;  // HTML 格式的详细描述
  project: PingCodeProject;
  assignee?: PingCodeUser;
  state?: string;
  type?: string;
  properties?: PingCodeWorkItemProperties;  // 自定义字段
  public_image_token?: string;  // API 返回的图片 token
}

export interface PaginatedResponse<T> {
  values: T[];
  total: number;
  page_index: number;
  page_size: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
