import { request } from '../utils/request';

// 定义类型 (对照 Swagger Components)
export interface User {
  id: string;
  wechatOpenid?: string;
  nickname: string;
  avatarUrl: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Room {
  id: string;
  roomNumber: string;
  name: string;
  creatorId?: string;
  status: 'active' | 'settled';
  createdAt?: string;
  updatedAt?: string;
}

export interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  roomNickname: string;
  roomAvatar: string;
  isOnline: boolean;
  isCreator: boolean;
  score: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoomParticipation {
  userId: string;
  id: string;
  roomId: string;
  roomNickname: string;
  roomAvatar: string;
  isOnline: boolean;
  isCreator: boolean;
  score: number;
  createdAt: string;
  updatedAt: string;
  room: Room;
}


export interface Transfer {
  id: string;
  roomId: string;
  senderId: string;
  receiverId: string;
  amount: number;
  status: 'completed' | 'reverted';
  createdAt?: string;
  updatedAt?: string;
}

export interface SettlementItem {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export interface RoomSettlementDetails {
  room: Room;
  members: RoomMember[];
  transfers: Transfer[];
  settlement: SettlementItem[];
  roomDetails: {
    totalDuration: string;
    createdAt: string;
    creator: { id: string, nickname: string, avatarUrl: string };
    creatorScore: string;
  }
}

export interface UserStats {
  nickname: string;
  totalLosses: number;
  totalProfit: string;
  totalWins: number;
  userId: string;
  winRate: number;
  frequentFriends: [{ userId: string, nickname: string, playCount: number }]
}

// 接口函数
export const api = {
  // 登录
  login: (data: { code: string; }) =>
    request<User>({ url: '/api/users/auth/wechat', method: 'POST', data }),
  // 获取用户信息
  getUserInfo: (userId: string) =>
    request<User>({ url: `/api/users/${userId}`, method: 'GET' }),

  // 创建房间
  createRoom: (creatorId: string, name: string) =>
    request<Room>({ url: '/api/rooms/create', method: 'POST', data: { creatorId, name } }),

  // 加入房间
  joinRoom: (data: { roomNumber: string; userId: string; roomNickname: string; roomAvatar: string }) =>
    request<RoomMember>({ url: '/api/rooms/join', method: 'POST', data }),

  // 离开房间
  leaveRoom: (data: { roomId: string; userId: string }) =>
    request<any>({ url: '/api/rooms/leave', method: 'POST', data }),

  // 结算房间
  settleRoom: (data: { roomId: string; userId: string }) =>
    request<Room>({ url: '/api/rooms/settle', method: 'POST', data }),

  // 获取用户参与的房间列表
  getRoomByUser: (userId: string) =>
    request<RoomParticipation>({ url: `/api/users/${userId}/participation`, method: 'GET' }),

  // 根据房间号获取房间信息
  getRoomByNumber: (roomNumber: string) =>
    request<Room>({ url: `/api/rooms/${roomNumber}`, method: 'GET' }),

  // 获取房间成员
  getMembers: (roomId: string) =>
    request<RoomMember[]>({ url: `/api/rooms/${roomId}/members`, method: 'GET' }),

  // 创建转分
  createTransfer: (data: { roomId: string; senderId: string; receiverId: string; amount: number }) =>
    request<Transfer>({ url: '/api/transfers/create', method: 'POST', data }),

  // 撤销转分
  revertTransfer: (data: { transferId: string; userId: string }) =>
    request<Transfer>({ url: '/api/transfers/revert', method: 'POST', data }),

  // 获取房间转分历史
  getTransfersByRoom: (roomId: string) =>
    request<Transfer[]>({ url: `/api/transfers/room/${roomId}`, method: 'GET' }),

  // 根据ID获取转分记录
  getTransferById: (transferId: string) =>
    request<Transfer>({ url: `/api/transfers/${transferId}`, method: 'GET' }),

  // 获取结算建议
  getSettlement: (roomId: string) =>
    request<SettlementItem[]>({ url: `/api/settlements/room/${roomId}`, method: 'GET' }),

  // 获取房间结算详情
  getSettlementDetails: (roomId: string) =>
    request<RoomSettlementDetails>({ url: `/api/settlements/room/${roomId}/details`, method: 'GET' }),

  // 获取用户参与的房间列表
  getParticipations: (userId: string) =>
    request<RoomParticipation[]>({ url: `/api/users/${userId}/participations`, method: 'GET' }),

  // 获取用户统计信息
  getUserStats: (userId: string) =>
    request<UserStats>({ url: `/api/settlements/user/${userId}/stats`, method: 'GET' }),

  // 根据ID获取用户信息
  getUserById: (id: string) =>
    request<User>({ url: `/api/users/${id}`, method: 'GET' }),

  // 更新用户信息
  updateUser: (id: string, data: { nickname?: string; avatarUrl?: string }) =>
    request<User>({ url: `/api/users/${id}`, method: 'PUT', data })
};
