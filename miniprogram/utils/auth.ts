import { api } from "../services/api"
interface User {
  id: string;
  nickname: string;
  avatarUrl: string;
  // 可扩展字段
  [key: string]: any;
}

// 本地缓存 key
const USER_KEY = 'userInfo';
export async function silentLogin(): Promise<User> {
  // 先检查缓存
  wx.setStorageSync(USER_KEY, null)
  const cached = wx.getStorageSync(USER_KEY);
  if (cached) return cached;

  try {
    // 1️⃣ wx.login 获取 code
    const code = await new Promise<string>((resolve, reject) => {
      wx.login({
        success: res => res.code ? resolve(res.code) : reject('no code'),
        fail: reject
      });
    });

    // 2️⃣ 调后端接口获取用户信息
    const res = await api.login({ code });
    const user = res.data;
    // 3️⃣ 存缓存
    wx.setStorageSync(USER_KEY, user);

    return user;
  } catch (error) {
    console.error('静默登录失败', error);
    throw error;
  }
}

// 获取缓存用户，不触发登录
export function getCachedUser(): User | null {
  return wx.getStorageSync(USER_KEY) || null;
}

// 确保用户已登录，未登录则触发登录流程
export async function ensureLogin(): Promise<User> {
  const cachedUser = getCachedUser();
  if (cachedUser) {
    return cachedUser;
  }
  return await silentLogin();
}