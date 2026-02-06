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
   * 加载对局历史
   * 注：Swagger 中目前没有直接的“我的对局列表”接口
   * 1.0 版本我们先从本地缓存获取，或者你可以增加一个接口
   */
  loadHistory() {
    // 优先展示示例数据或本地存储的数据
    const localHistory = wx.getStorageSync('game_history') || [
      { id: '1', name: '周末园艺局', roomNumber: '402', date: '2026.02.04', profit: 25.5 },
      { id: '2', name: '春节麻将局', roomNumber: '888', date: '2026.01.29', profit: -45.0 },
      { id: '3', name: '德州友谊赛', roomNumber: '102', date: '2026.01.15', profit: 120.0 }
    ];

    this.setData({ historyList: localHistory });
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