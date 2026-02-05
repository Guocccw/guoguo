import { request } from '../utils/request';

export interface BaseResponse<T = any> {
  data: T;
  message: string;
  path: string;
  statusCode: number;
  timestamp: string;
}

// 定义类型 (对照 Swagger Components)
export interface User {
  id: string;
  nickname: string;
  avatarUrl: string;
}

export interface Room {
  id: string;
  roomNumber: string;
  name: string;
  status: 'active' | 'settled';
}

export interface RoomMember {
  userId: string;
  roomNickname: string;
  roomAvatar: string;
  balance?: number; // 业务扩展字段
}

// 接口函数
export const api = {
  // 登录
  login: (data: { code: string; }) =>
    request<BaseResponse<User>>({ url: '/api/users/auth/wechat', method: 'POST', data }),

  // 创建房间
  createRoom: (creatorId: string, name: string) =>
    request<Room>({ url: '/api/rooms/create', method: 'POST', data: { creatorId, name } }),

  // 加入房间
  joinRoom: (data: { roomNumber: string; userId: string; roomNickname: string; roomAvatar: string }) =>
    request<any>({ url: '/api/rooms/join', method: 'POST', data }),

  // 获取房间成员
  getMembers: (roomId: string) =>
    request<RoomMember[]>({ url: `/api/rooms/${roomId}/members`, method: 'GET' }),

  // 创建转账
  createTransfer: (data: { roomId: string; senderId: string; receiverId: string; amount: number }) =>
    request({ url: '/api/transfers/create', method: 'POST', data }),

  // 获取结算建议
  getSettlement: (roomId: string) =>
    request<any[]>({ url: `/api/settlements/room/${roomId}`, method: 'GET' }),

  // 根据ID获取用户信息
  getUserById: (id: string) =>
    request<User>({ url: `/api/users/${id}`, method: 'GET' }),

  // 更新用户信息
  updateUser: (id: string, data: { nickname?: string; avatarUrl?: string }) =>
    request<User>({ url: `/api/users/${id}`, method: 'PUT', data })
};