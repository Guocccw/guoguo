const BASE_URL = 'http://192.168.137.225:3000'; // 生产环境替换为真实域名

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
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else {
          wx.showToast({ title: '请求失败', icon: 'error' });
          reject(res);
        }
      },
      fail: (err) => {
        wx.showToast({ title: '网络异常', icon: 'error' });
        reject(err);
      }
    });
  });
};