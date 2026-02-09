import { api } from '../../services/api';

Page({
  data: {
    statusBarHeight: 20,
    userInfo: {} as any,
    stats: {} as any,
    absBalance: '0',
    historyList: [] as any[]
  },

  onLoad() {
    const windowInfo = (wx as any).getWindowInfo();
    const userInfo = wx.getStorageSync('userInfo');

    this.setData({
      statusBarHeight: windowInfo.statusBarHeight,
      userInfo: userInfo
    });
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      });
    }
    // 重新获取用户信息，确保更新
    const userInfo = wx.getStorageSync('userInfo');
    this.setData({ userInfo: userInfo });
    this.loadStats();
    this.loadHistory();
  },

  /**
   * 加载统计数据
   */
  async loadStats() {
    const { userInfo } = this.data;
    if (!userInfo?.id) return;

    try {
      const res = await api.getUserStats(userInfo.id);
      const stats = res.data || {};
      // 根据UserStats接口，使用totalProfit代替balance
      const totalProfit = parseFloat(stats.totalProfit) || 0;
      this.setData({
        stats: stats,
        absBalance: Math.abs(totalProfit).toFixed(1)
      });
    } catch (e) {
      console.error('获取统计失败', e);
      // 出错时确保显示0
      this.setData({
        absBalance: '0'
      });
    }
  },
  /**
   * 格式化日期为yyyy-MM-dd格式
   */
  formatDate(dateString: string) {
    // 检查是否为空字符串
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  /**
   * 加载对局历史
   */
  async loadHistory() {
    console.log('loadHistory');
    const { userInfo } = this.data;
    if (!userInfo?.id) return;

    try {
      const res = await api.getParticipations(userInfo.id);
      const historyList = res.data.map(item => ({
        ...item,
        createdAt: this.formatDate(item.createdAt)
      })) || [];
      this.setData({ historyList: historyList });
    } catch (e) {
      console.error('获取对局历史失败', e);
      // 出错时确保显示空数组
      this.setData({ historyList: [] });
    }
  },

  switchTab(e: any) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === 'lobby') {
      wx.reLaunch({ url: '/pages/index/index' });
    }
  },

  goToProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' });
  },

  viewRoomDetail(e: any) {
    const roomId = e.currentTarget.dataset.id;
    // 这里可以跳转到结算详情页（如果后续开发的话）
    wx.showToast({ title: '详情功能开发中', icon: 'none' });
  }
});