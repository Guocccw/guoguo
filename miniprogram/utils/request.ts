const BASE_URL = "https://www.guoguoscore.cloud/";

interface RequestOption {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS';
  data?: any;
  header?: any;
}

export const request = <T>(options: RequestOption): Promise<T> => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');
    wx.request({
      ...options,
      url: `${BASE_URL}${options.url}`,
      header: {
        ...options.header,
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        const { statusCode, data } = res;

        // 1. 成功处理
        if (statusCode >= 200 && statusCode < 300) {
          resolve(data as T);
          return;
        }

        // 2. 错误分类处理
        switch (statusCode) {
          case 401:
            wx.showToast({ title: '登录已过期', icon: 'none' });
            // 可以跳转到登录页
            break;
          case 403:
            wx.showToast({ title: '权限不足', icon: 'none' });
            break;
          case 409:
            // 重点：这里拦截你刚改的“已在房间”逻辑
            wx.showToast({
              title: (data as any).message || '状态冲突',
              icon: 'none'
            });
            break;
          case 500:
            wx.showToast({ title: '服务器开小差了', icon: 'error' });
            break;
          default:
            wx.showToast({ title: '请求出错', icon: 'error' });
        }

        reject(res);
      },
      fail: (err) => {
        wx.showToast({ title: '网络异常', icon: 'error' });
        reject(err);
      }
    });
  });
};