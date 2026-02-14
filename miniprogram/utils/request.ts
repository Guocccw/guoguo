// request.ts
const BASE_URL = 'https://guoguoscore.cloud';

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface RequestOption {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  header?: any;
}

export function request<T>(options: RequestOption): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request<ApiResponse<T>>({
      url: BASE_URL + options.url,
      method: options.method ?? 'GET',
      data: options.data,
      header: options.header,
      success(res) {
        const { statusCode, data } = res;

        // 网络/协议层错误
        if (statusCode !== 200) {
          wx.showToast({ title: '网络错误', icon: 'none' });
          reject(res);
          return;
        }

        // 业务层错误（完全由后端决定）
        if (data.code !== 200) {
          wx.showToast({
            title: data.message || '操作失败',
            icon: 'none',
          });
          reject(data);
          return;
        }

        resolve(data.data);
      },
      fail(err) {
        wx.showToast({ title: '网络异常', icon: 'none' });
        reject(err);
      },
    });
  });
}